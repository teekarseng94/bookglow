/**
 * Public Booking Portal: /book/:bookingPath
 * bookingPath is either the Firestore outlet id (e.g. outlet_001) or outlets.bookingSlug (e.g. baliWellness).
 * Two-column layout: left = Services, Team, Good to know, Reviews, Address + map; right = sticky sidebar with name, Book, Open/Closed, hours, address.
 * Real-time Firestore listener for outlets/{resolvedOutletId} to sync addressDisplay, phoneNumber, businessHours.
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth, FRONTEND_CUSTOMER_COLLECTION } from "../../services/firebase";
import { resolveDataProvider, resolveAuthProvider } from "@bookglow/shared-types";
import { resolveOutletIdFromBookingPath } from "../../services/bookingPathResolve";
import {
  getPublicOutletData,
  createPublicBooking,
  getAvailableSlots,
  submitPublicReview,
  PublicService,
  PublicOutlet,
  PublicTeamMember,
} from "../../services/bookingApi";
import {
  getPublicOutletFromSupabase,
  listVisibleServicesFromSupabase,
  listStaffFromSupabase,
  getAvailableSlotsFromSupabase,
  createPublicBookingFromSupabase,
  submitPublicReviewFromSupabase,
  upsertFrontendCustomerProfileFromSupabase,
} from "../../services/supabasePublicBooking";
import { createBrowserSupabaseClient } from "@bookglow/supabase";
import {
  ANY_AVAILABLE_STAFF,
  BookingEmptyState,
  BookingMerchantHeader,
  BookingServiceCard,
  BookingStateScreen,
  BookingStickyAction,
  friendlyBookingError,
} from "../../components/booking";

type SelectedServiceSelection = {
  /** Unique per click/selection (allows selecting same service multiple times). */
  selectionId: string;
  service: PublicService;
};

function createSelectionId(): string {
  // Browser-safe unique id (crypto.randomUUID when available)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = typeof crypto !== "undefined" ? crypto : null;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    // ignore
  }
  return `sel_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const DAY_LABELS: Record<string, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

/** Display order: Monday through Sunday (as in settings and 22.png) */
const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/** Parse "HH:mm" or "H:mm" to minutes since midnight */
function parseTimeToMinutes(t: string): number {
  const [h, m] = t.trim().split(":").map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
}

/** Format time string (HH:mm) to "X AM/PM" format (e.g., "17:00" -> "5 PM") */
function formatTimeToAMPM(timeStr: string): string {
  const [h, m] = timeStr.trim().split(":").map((x) => parseInt(x, 10) || 0);
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${hour12} ${ampm}`;
}

/** Format "HH:mm" -> "HHmm" for booking timetable (e.g., "11:30" -> "1130") */
function formatTimeToCompact(timeStr: string): string {
  return timeStr.includes(":") ? timeStr.replace(":", "") : timeStr;
}

/** Format Date to local YYYY-MM-DD string (no timezone shift like toISOString) */
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Build time slots (HH:mm) from outlet business hours for a given date */
function buildTimeSlotsForDate(
  dateStr: string,
  businessHours?: Record<string, { open: string; close: string; isOpen?: boolean }>
): string[] {
  if (!businessHours || Object.keys(businessHours).length === 0) {
    return [];
  }

  const baseDate = dateStr
    ? new Date(`${dateStr}T00:00:00`)
    : new Date();
  const dayIndex = baseDate.getDay(); // 0 = Sunday
  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  const todayKey = dayKeys[dayIndex];
  const today = businessHours[todayKey];

  if (!today || today.isOpen === false) {
    return [];
  }

  const openM = parseTimeToMinutes(today.open);
  const closeM = parseTimeToMinutes(today.close);
  if (!Number.isFinite(openM) || !Number.isFinite(closeM) || closeM <= openM) {
    return [];
  }

  const slots: string[] = [];
  // 30-minute increments between open (inclusive) and close (exclusive)
  for (let minutes = openM; minutes < closeM; minutes += 30) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

/** Get open/closed status and next close time from businessHours (local time) */
function getOpenClosedStatus(businessHours?: Record<string, { open: string; close: string; isOpen?: boolean }>): { isOpen: boolean; closesAt?: string } {
  if (!businessHours || Object.keys(businessHours).length === 0) {
    return { isOpen: true };
  }
  const now = new Date();
  const dayIndex = now.getDay(); // 0 = Sunday
  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const todayKey = dayKeys[dayIndex];
  const today = businessHours[todayKey];
  if (!today || today.isOpen === false) {
    return { isOpen: false };
  }
  const openM = parseTimeToMinutes(today.open);
  const closeM = parseTimeToMinutes(today.close);
  const currentM = now.getHours() * 60 + now.getMinutes();
  const isOpen = currentM >= openM && currentM < closeM;
  const closesAt = formatTimeToAMPM(today.close);
  return { isOpen, closesAt };
}

export function BookingPage() {
  const { bookingPath } = useParams<{ bookingPath: string }>();
  const navigate = useNavigate();
  const pathSegment = (bookingPath ?? "").trim();
  const [resolvedOutletId, setResolvedOutletId] = useState<string | null>(null);
  const [pathResolveDone, setPathResolveDone] = useState(false);
  const outletId = resolvedOutletId ?? "";
  const [outlet, setOutlet] = useState<PublicOutlet | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [team, setTeam] = useState<PublicTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<"service" | "datetime" | "contact">("service");
  const [selectedServices, setSelectedServices] = useState<SelectedServiceSelection[]>([]);
  // serviceTeamMembers: Record<selectionId, teamMemberId> - one therapist per selected service row
  const [serviceTeamMembers, setServiceTeamMembers] = useState<Record<string, string | null>>({});
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [showHours, setShowHours] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  /** Preferred therapist from “Meet the team”; applied when services are selected. */
  const [preferredStaffId, setPreferredStaffId] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  // Map /book/:segment → real outlet document id (legacy id or bookingSlug)
  useEffect(() => {
    if (!pathSegment) {
      setResolvedOutletId(null);
      setPathResolveDone(true);
      setError("Missing outlet");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setPathResolveDone(false);
    setResolvedOutletId(null);
    setError(null);
    setLoading(true);

    resolveOutletIdFromBookingPath(pathSegment)
      .then((id) => {
        if (cancelled) return;
        setResolvedOutletId(id);
        setPathResolveDone(true);
        if (!id) {
          setError("Shop not found");
          setLoading(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setResolvedOutletId(null);
        setPathResolveDone(true);
        setError("Could not load this shop.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pathSegment]);

  // Replace legacy /book/outlet_xxx with /book/:bookingSlug when a slug is configured
  useEffect(() => {
    if (!pathResolveDone || !resolvedOutletId || !outlet?.bookingSlug) return;
    if (pathSegment === resolvedOutletId && pathSegment !== outlet.bookingSlug) {
      navigate(`/book/${outlet.bookingSlug}${window.location.search}`, { replace: true });
    }
  }, [pathResolveDone, resolvedOutletId, pathSegment, outlet?.bookingSlug, navigate, outlet]);

  const openClosed = useMemo(() => getOpenClosedStatus(outlet?.businessHours), [outlet?.businessHours]);

  // Distinct categories from services. Order matches backend Menu (outlet.serviceCategories) when available.
  const categories = useMemo(() => {
    const set = new Set<string>();
    let hasPromotion = false;

    services.forEach((s) => {
      const cat = (s.category || "").trim();
      if (cat) set.add(cat);
      if (s.isPromotion) hasPromotion = true;
    });

    const fromServices = Array.from(set);
    const configured =
      Array.isArray(outlet?.serviceCategories) && outlet.serviceCategories.length > 0
        ? outlet.serviceCategories.filter((c) => (c || "").trim() !== "")
        : [];

    let ordered: string[] = [];

    if (configured.length > 0) {
      // Use backend-defined order, but only keep categories that actually exist in services
      ordered = configured.filter((cat) => {
        const cLower = cat.toLowerCase();
        if (cLower === "promotion") {
          return hasPromotion;
        }
        return fromServices.some((sCat) => sCat.toLowerCase() === cLower);
      });
    } else {
      // Fallback: alphabetical order
      ordered = fromServices.sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );
    }

    // Any remaining service categories not in configured list get appended alphabetically
    const remaining = fromServices
      .filter(
        (cat) => !ordered.some((c) => c.toLowerCase() === cat.toLowerCase())
      )
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    let final = [...ordered, ...remaining];

    // Ensure Promotion tab exists if there are promotions and not already present
    if (
      hasPromotion &&
      !final.some((c) => c.toLowerCase() === "promotion")
    ) {
      final.push("Promotion");
    }

    return final;
  }, [services, outlet?.serviceCategories]);

  // Watch auth state (Firebase or Supabase) for header email + review gate
  useEffect(() => {
    const env = import.meta.env as unknown as Record<string, string | undefined>;
    if (resolveAuthProvider(env) === "supabase") {
      const sb = createBrowserSupabaseClient(env);
      let cancelled = false;

      const applyUser = async (email: string | null, userId: string | null) => {
        if (cancelled) return;
        if (!userId) {
          setCurrentUserEmail(null);
          setIsSignedIn(false);
          return;
        }
        try {
          await upsertFrontendCustomerProfileFromSupabase({ email });
        } catch (err) {
          console.warn("upsertFrontendCustomerProfileFromSupabase:", err);
        }
        if (cancelled) return;
        setCurrentUserEmail(email);
        setIsSignedIn(true);
      };

      sb.auth.getSession().then(({ data }) => {
        const user = data.session?.user;
        void applyUser(user?.email ?? null, user?.id ?? null);
      });

      const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
        const user = session?.user;
        void applyUser(user?.email ?? null, user?.id ?? null);
      });

      return () => {
        cancelled = true;
        sub.subscription.unsubscribe();
      };
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUserEmail(null);
        setIsSignedIn(false);
        return;
      }

      // Booking-site profiles live in frontend_customer/{uid}; staff accounts only have users/{uid}.
      const primary = await getDoc(doc(db, FRONTEND_CUSTOMER_COLLECTION, user.uid));
      if (primary.exists()) {
        setCurrentUserEmail(user.email ?? null);
        setIsSignedIn(true);
        return;
      }
      const legacy = await getDoc(doc(db, "customers", user.uid));
      const ok = legacy.exists();
      setCurrentUserEmail(ok ? user.email ?? null : null);
      setIsSignedIn(ok);
    });
    return unsubscribe;
  }, []);

  // Filter services by selected category and search by name
  const filteredServices = useMemo(() => {
    let list = services;
    if (selectedCategory && selectedCategory !== "All") {
      if (selectedCategory === "Promotion") {
        list = list.filter((s) => s.isPromotion === true || (s.category || "").toLowerCase() === "promotion");
      } else {
        list = list.filter(
          (s) => (s.category || "").toLowerCase() === selectedCategory.toLowerCase()
        );
      }
    }
    const q = (searchQuery || "").trim().toLowerCase();
    if (q) {
      list = list.filter((s) => (s.name || "").toLowerCase().includes(q));
    }
    return list;
  }, [services, selectedCategory, searchQuery]);

  const handleShare = async () => {
    if (shareLoading) return;
    try {
      setShareLoading(true);
      const url = window.location.href;
      const name = outlet?.name || "Bali Wellness";
      const title = `${name} | Kuala Lumpur [ Book now ]`;
      const text = `Book your wellness session at ${name}.`;

      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url,
        });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setShareToast("Link Copied!");
        setTimeout(() => setShareToast(null), 2000);
      } else {
        // Last-resort fallback
        const dummy = document.createElement("input");
        dummy.value = url;
        document.body.appendChild(dummy);
        dummy.select();
        document.execCommand("copy");
        document.body.removeChild(dummy);
        setShareToast("Link Copied!");
        setTimeout(() => setShareToast(null), 2000);
      }
    } catch (err) {
      console.error("[Booking] Share failed:", err);
    } finally {
      setShareLoading(false);
    }
  };

  // Fetch available slots (master schedule + existing appointments) for a given date/service/teamMember
  const fetchAvailableSlots = useCallback(
    async (targetDate: string, service: PublicService | null, teamMemberId?: string | null) => {
      if (!outletId || !service || !targetDate) {
        setAvailableSlots([]);
        return;
      }
      try {
        setSlotsLoading(true);
        const payload = {
          outletId,
          serviceId: service.id,
          date: targetDate,
          staffId:
            teamMemberId && teamMemberId.trim().length > 0 ? teamMemberId.trim() : undefined,
        };

        if (
          resolveDataProvider(import.meta.env as unknown as Record<string, string | undefined>) ===
          "supabase"
        ) {
          const slots = await getAvailableSlotsFromSupabase(payload);
          setAvailableSlots(Array.isArray(slots) ? slots : []);
          return;
        }

        const { slots } = await getAvailableSlots(payload);
        setAvailableSlots(Array.isArray(slots) ? slots : []);
      } catch (err) {
        console.error("fetchAvailableSlots error:", err);
        // Fallback: use schedule only (no appointment filtering)
        setAvailableSlots(
          buildTimeSlotsForDate(targetDate, outlet?.businessHours)
        );
      } finally {
        setSlotsLoading(false);
      }
    },
    [outletId, outlet?.businessHours]
  );

  // Handle service selection: ALWAYS add a new selection row (same service can be selected multiple times)
  const handleServiceClick = (service: PublicService) => {
    const selectionId = createSelectionId();
    setSelectedServices((prev) => [...prev, { selectionId, service }]);
    setServiceTeamMembers((prev) => ({
      ...prev,
      [selectionId]: preferredStaffId,
    }));
  };

  const removeSelectedService = (selectionId: string) => {
    setSelectedServices((prev) => prev.filter((s) => s.selectionId !== selectionId));
    setServiceTeamMembers((prev) => {
      const updated = { ...prev };
      delete updated[selectionId];
      return updated;
    });
  };

  // Set therapist for a specific selected service row
  const setServiceTeamMember = (selectionId: string, teamMemberId: string | null) => {
    const teamMember = teamMemberId ? team.find((t) => t.id === teamMemberId) : null;
    const sel = selectedServices.find((s) => s.selectionId === selectionId);
    console.log(`[Team Selection] Service: ${sel?.service?.name || selectionId}, Selected: ${teamMember?.name || teamMemberId || 'None'}`);

    setServiceTeamMembers((prev) => ({
      ...prev,
      [selectionId]: teamMemberId,
    }));
  };

  /** Prefer a therapist from the People section; apply to all selected services. */
  const handleTeamCardClick = (memberId: string) => {
    const next = preferredStaffId === memberId ? null : memberId;
    setPreferredStaffId(next);
    if (selectedServices.length === 0) {
      document.getElementById("services")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setServiceTeamMembers((prev) => {
      const updated = { ...prev };
      for (const sel of selectedServices) {
        updated[sel.selectionId] = next;
      }
      return updated;
    });
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outletId) return;
    setReviewError(null);
    setReviewSuccess(null);
    const author = reviewAuthor.trim() || currentUserEmail?.split("@")[0] || "Guest";
    const text = reviewText.trim();
    if (text.length < 3) {
      setReviewError("Please write a short review.");
      return;
    }
    if (!isSignedIn) {
      setReviewError("Sign in to leave a review.");
      navigate(`/book/${pathSegment}/auth?return=${encodeURIComponent(`/book/${pathSegment}#reviews`)}`);
      return;
    }
    setReviewSubmitting(true);
    try {
      const useSupabase =
        resolveDataProvider(import.meta.env as unknown as Record<string, string | undefined>) ===
        "supabase";
      if (useSupabase) {
        // Reviews RPC requires a Supabase Auth JWT (set VITE_AUTH_PROVIDER=supabase).
        if (resolveAuthProvider(import.meta.env as unknown as Record<string, string | undefined>) !== "supabase") {
          throw new Error("Supabase reviews require VITE_AUTH_PROVIDER=supabase.");
        }
        await submitPublicReviewFromSupabase({
          outletId,
          author,
          text,
          rating: reviewRating,
        });
      } else {
        await submitPublicReview({
          outletId,
          author,
          text,
          rating: reviewRating,
        });
      }
      setOutlet((prev) =>
        prev
          ? {
              ...prev,
              reviews: [
                ...(prev.reviews || []),
                { author, text, rating: reviewRating },
              ],
            }
          : prev
      );
      setReviewText("");
      setReviewAuthor("");
      setReviewRating(5);
      setShowReviewForm(false);
      setReviewSuccess("Thanks — your review was submitted.");
    } catch (err) {
      setReviewError(friendlyBookingError(err, "Could not submit review."));
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Outlet load: Firestore realtime (default) or one-shot Supabase when VITE_DATA_PROVIDER=supabase
  useEffect(() => {
    if (!pathResolveDone || !resolvedOutletId) {
      return;
    }

    if (resolveDataProvider(import.meta.env as unknown as Record<string, string | undefined>) === "supabase") {
      let cancelled = false;
      getPublicOutletFromSupabase(resolvedOutletId)
        .then((o) => {
          if (cancelled) return;
          if (o) {
            setOutlet(o);
            setLoading(false);
            setError(null);
          } else {
            setError("Outlet not found");
            setLoading(false);
          }
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          setError(friendlyBookingError(e, "Could not load this shop."));
          setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    let hasReceivedData = false;
    const outletRef = doc(db, "outlets", resolvedOutletId);
    const unsubscribe = onSnapshot(
      outletRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          // Fallback to Cloud Function if document doesn't exist or listener fails
          if (!hasReceivedData) {
            getPublicOutletData(resolvedOutletId)
              .then(({ outlet: o }) => {
                if (o) {
                  setOutlet(o);
                  setLoading(false);
                  setError(null);
                } else {
                  setError("Outlet not found");
                  setLoading(false);
                }
              })
              .catch((e: unknown) => {
                setError(friendlyBookingError(e, "Could not load this shop."));
                setLoading(false);
              });
          }
          return;
        }

        hasReceivedData = true;
        const data = snapshot.data();
        const businessHours = (data.businessHours && typeof data.businessHours === "object" && Object.keys(data.businessHours).length > 0) 
          ? data.businessHours 
          : {};
        
        setOutlet({
          id: snapshot.id,
          name: data.name || "Spa",
          addressDisplay: data.addressDisplay || "",
          phoneNumber: data.phoneNumber || data.phone || "",
          businessHours,
          timezone: data.timezone || "Asia/Kuala_Lumpur",
          reviews: data.reviews || [],
          serviceCategories: Array.isArray(data.serviceCategories)
            ? data.serviceCategories
            : [],
          bookingSlug:
            typeof data.bookingSlug === "string" && data.bookingSlug.trim() !== ""
              ? data.bookingSlug.trim()
              : undefined,
        });
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore listener error for outlet:", err);
        // Fallback to Cloud Function if listener fails (e.g., permission denied)
        if (!hasReceivedData) {
          getPublicOutletData(resolvedOutletId)
            .then(({ outlet: o }) => {
              if (o) {
                setOutlet(o);
                setLoading(false);
                setError(null);
              } else {
                setError(friendlyBookingError(err, "Could not load this shop."));
                setLoading(false);
              }
            })
            .catch((e: unknown) => {
              setError(friendlyBookingError(e, "Could not load this shop."));
              setLoading(false);
            });
        }
      }
    );

    return () => unsubscribe();
  }, [pathResolveDone, resolvedOutletId]);

  // Services load: Firestore (default) or Supabase when VITE_DATA_PROVIDER=supabase
  useEffect(() => {
    if (!outletId) return;

    let cancelled = false;

    if (resolveDataProvider(import.meta.env as unknown as Record<string, string | undefined>) === "supabase") {
      listVisibleServicesFromSupabase(outletId)
        .then((svc) => {
          if (!cancelled) setServices(svc);
        })
        .catch((err) => {
          console.error("Supabase services fetch error:", err);
        });
      return () => {
        cancelled = true;
      };
    }

    const toServices = (
      docs: Array<{ id: string; data: () => Record<string, unknown> }>
    ): PublicService[] =>
      docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: (data.name as string) || "",
            price: (data.price as number) ?? 0,
            duration: (data.duration as number) ?? 60,
            category: (data.category as string) || "",
            isPromotion: (data.isPromotion as boolean) ?? false,
            visible: data.isVisible !== false,
          };
        })
        .filter((item) => item.visible)
        .map(({ visible: _v, ...rest }) => rest)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    const applyFromDocs = (docs: Array<{ id: string; data: () => Record<string, unknown> }>) => {
      if (!cancelled) setServices(toServices(docs));
    };

    const servicesQuery = query(collection(db, "services"), where("outletID", "==", outletId));

    getDocs(servicesQuery)
      .then((snapshot) => applyFromDocs(snapshot.docs))
      .catch((err) => {
        console.error("Firestore getDocs error for services:", err);
        getPublicOutletData(outletId)
          .then(({ services: svc }) => {
            if (!cancelled && Array.isArray(svc) && svc.length > 0) {
              setServices(
                [...svc].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
              );
            }
          })
          .catch((fallbackErr) => {
            console.error("getPublicOutletData services fallback failed:", fallbackErr);
          });
      });

    const unsubscribe = onSnapshot(
      servicesQuery,
      (snapshot) => applyFromDocs(snapshot.docs),
      (err) => {
        console.error("Firestore listener error for services:", err);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [outletId]);

  // Team load: Firestore realtime (default) or one-shot Supabase when VITE_DATA_PROVIDER=supabase
  useEffect(() => {
    if (!outletId) return;

    if (resolveDataProvider(import.meta.env as unknown as Record<string, string | undefined>) === "supabase") {
      let cancelled = false;
      listStaffFromSupabase(outletId)
        .then((nextTeam) => {
          if (!cancelled) setTeam(nextTeam);
        })
        .catch((err) => {
          console.error("Supabase staff fetch error:", err);
        });
      return () => {
        cancelled = true;
      };
    }

    const staffRef = collection(db, "staff");
    const staffQuery = query(staffRef, where("outletID", "==", outletId));

    const unsubscribe = onSnapshot(
      staffQuery,
      (snapshot) => {
        const nextTeam: PublicTeamMember[] = snapshot.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: data.name || "",
            profilePicture: data.profilePicture || data.photoURL || "",
            qualifiedServices: Array.isArray(data.qualifiedServices)
              ? data.qualifiedServices
              : undefined,
          };
        });
        setTeam(nextTeam);
      },
      (err) => {
        console.error("Firestore listener error for team:", err);
      }
    );

    return () => unsubscribe();
  }, [outletId]);

  // Date/time constraints: prevent booking in the past (local time)
  const now = new Date();
  const todayLocalDate = formatLocalDate(now);

  const minDate = todayLocalDate;
  const maxDate = (() => {
    const d = new Date(now);
    d.setDate(d.getDate() + 60);
    return formatLocalDate(d);
  })();

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // On initial load, precompute available slots when a service is selected and
  // business hours are available. Does NOT auto-select any service.
  useEffect(() => {
    if (!outletId || services.length === 0 || !outlet?.businessHours || Object.keys(outlet.businessHours).length === 0) {
      return;
    }

    const today = formatLocalDate(new Date());

    if (!selectedDate) {
      setSelectedDate(today);
    }

    const dateForSlots = selectedDate || today;
    const serviceForSlots = selectedServices.length > 0 ? selectedServices[0].service : null;
    if (serviceForSlots && dateForSlots) {
      fetchAvailableSlots(dateForSlots, serviceForSlots);
    }
  }, [outletId, services, outlet?.businessHours, selectedServices, selectedDate, fetchAvailableSlots]);

  // Recompute available slots whenever selected services/date/team members change in the datetime step
  // Only runs when businessHours is available
  useEffect(() => {
    if (selectedServices.length === 0 || !selectedDate || !outlet?.businessHours || Object.keys(outlet.businessHours).length === 0) {
      if (selectedServices.length === 0 || !selectedDate) {
        setAvailableSlots([]);
      }
      return;
    }
    // Use first selected service for slot calculation
    // If team members are selected for this service, filter by their availability
    const firstSelection = selectedServices[0];
    const firstService = firstSelection.service;
    const selectedTeamMemberId = serviceTeamMembers[firstSelection.selectionId] || null;
    fetchAvailableSlots(
      selectedDate,
      firstService,
      selectedTeamMemberId === ANY_AVAILABLE_STAFF ? null : selectedTeamMemberId
    );
  }, [selectedServices, selectedDate, serviceTeamMembers, fetchAvailableSlots, outlet?.businessHours]);

  const handleConfirmBooking = async () => {
    if (
      !outletId ||
      selectedServices.length === 0 ||
      !selectedDate ||
      !selectedTime ||
      !customerName.trim() ||
      !phone.trim()
    ) {
      setSubmitError("Please fill all required fields.");
      return;
    }
    // Validate therapist selection for all selected service rows (Any available is allowed)
    const missingTherapist = selectedServices.some((sel) => {
      const id = serviceTeamMembers[sel.selectionId];
      return !id;
    });
    if (missingTherapist) {
      setSubmitError("Please select a therapist for each selected service.");
      return;
    }
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      const useSupabase =
        resolveDataProvider(import.meta.env as unknown as Record<string, string | undefined>) ===
        "supabase";
      const bookingPromises = [];
      for (const sel of selectedServices) {
        const service = sel.service;
        const teamMemberId = serviceTeamMembers[sel.selectionId] || null;
        if (!teamMemberId) continue;

        const basePayload = {
          outletId,
          serviceId: service.id,
          date: selectedDate,
          time: selectedTime,
          customerName: customerName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
        };

        if (teamMemberId === ANY_AVAILABLE_STAFF) {
          bookingPromises.push(
            useSupabase
              ? createPublicBookingFromSupabase(basePayload)
              : createPublicBooking(basePayload)
          );
          continue;
        }

        const teamMember = team.find((t) => t.id === teamMemberId);
        if (!teamMember) {
          setSubmitError("Invalid therapist selected. Please try again.");
          setSubmitLoading(false);
          return;
        }

        bookingPromises.push(
          useSupabase
            ? createPublicBookingFromSupabase({ ...basePayload, staffId: teamMemberId })
            : createPublicBooking({ ...basePayload, staffId: teamMemberId })
        );
      }
      const results = await Promise.all(bookingPromises);
      setBookingId(results[0]?.appointmentId || "confirmed");
    } catch (e: unknown) {
      console.error("[Booking] Error creating booking:", e);
      setSubmitError(friendlyBookingError(e, "Booking failed. Please try again."));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleBookClick = () => {
    if (selectedServices.length === 0) {
      setSubmitError("Please select at least one service before booking.");
      return;
    }
    setSelectedDate("");
    setSelectedTime("");
    setStep("datetime");
  };

  if (!pathResolveDone || loading) {
    return (
      <BookingStateScreen
        tone="loading"
        title="Loading booking page"
        description="Preparing services and availability…"
      />
    );
  }

  if (error) {
    return (
      <BookingStateScreen
        tone="error"
        title="Booking page unavailable"
        description="Check the link or try again later."
      >
        <p className="mt-2 font-medium text-rose-700">{friendlyBookingError(error, error)}</p>
      </BookingStateScreen>
    );
  }

  if (bookingId) {
    return (
      <div className="bookglow-state-screen">
        <div className="booking-success-card">
          <div className="booking-success-icon">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="booking-summary__eyebrow mt-5">Appointment secured</span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Booking confirmed</h1>
          <p className="mt-2 text-slate-600">We look forward to seeing you at {outlet?.name}.</p>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">{selectedServices.map((s) => s.service.name).join(", ")}</p>
            <p className="mt-1 text-sm text-slate-500">
              {selectedDate} at {formatTimeToCompact(selectedTime)}
            </p>
          </div>
          <p className="mt-4 text-xs text-slate-400">Keep this page for your appointment details.</p>
        </div>
      </div>
    );
  }

  const address = outlet?.addressDisplay ?? "";
  const mapQuery = encodeURIComponent(address);
  const selectedTotal = selectedServices.reduce((total, item) => total + Number(item.service.price || 0), 0);

  return (
    <div className="bookglow-booking">
      <BookingMerchantHeader
        merchantName={outlet?.name || "Bookglow booking"}
        currentUserEmail={currentUserEmail}
        shareLoading={shareLoading}
        onShare={handleShare}
        onLogin={() => navigate(`/book/${outlet?.bookingSlug ?? outletId}/auth?loginSource=homepage`)}
      />

      {/* Simple toast for share fallback */}
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <div className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-medium shadow-lg shadow-slate-900/30">
            {shareToast}
          </div>
        </div>
      )}

      <div className="booking-layout">
        {/* Left column: scrollable content */}
        <div className="booking-main">
          {/* Services */}
          <section id="services" className="booking-section">
            <div className="booking-section__header"><div><span className="booking-section__eyebrow">Book online</span><h2>Choose a service</h2></div></div>

            {services.length > 0 && (
              <>
                {/* Mobile / tablet header (unchanged layout) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 lg:hidden">
                  <div className="booking-filter-row">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className={`booking-filter-chip ${
                        selectedCategory == null
                          ? "booking-filter-chip--active"
                          : ""
                      }`}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`booking-filter-chip ${
                          selectedCategory === cat
                            ? "booking-filter-chip--active"
                            : ""
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="booking-search flex-1 max-w-xs">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search services..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        aria-label="Search services by name"
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop header: categories left, large search on the right */}
                <div className="hidden lg:flex items-center justify-between gap-6 mb-4">
                  <div className="booking-filter-row">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className={`booking-filter-chip ${
                        selectedCategory == null
                          ? "booking-filter-chip--active"
                          : ""
                      }`}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`booking-filter-chip ${
                          selectedCategory === cat
                            ? "booking-filter-chip--active"
                            : ""
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-end flex-1">
                    <div className="booking-search w-full max-w-sm">
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search services..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-full border border-slate-200 text-sm text-slate-800 bg-white shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        aria-label="Search services by name"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {services.length === 0 ? (
              <BookingEmptyState
                title="No services available"
                description="This business has not published bookable services yet."
              />
            ) : filteredServices.length === 0 ? (
              <BookingEmptyState
                title="No matching services"
                description="Try another category or clear your search."
              />
            ) : (
              <div className="booking-service-list">
                {filteredServices.map((s) => {
                  const selectedCount = selectedServices.filter((sel) => sel.service.id === s.id).length;
                  return (
                    <BookingServiceCard
                      key={s.id}
                      name={s.name}
                      durationMinutes={s.duration}
                      category={s.category}
                      priceLabel={s.price ? `RM ${s.price}` : "Free"}
                      selectedCount={selectedCount}
                      onSelect={() => handleServiceClick(s)}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* Team */}
          <section id="team" className="booking-section">
            <div className="booking-section__header">
              <div>
                <span className="booking-section__eyebrow">People</span>
                <h2>Meet the team</h2>
              </div>
            </div>
            {team.length === 0 ? (
              <p className="text-slate-500 py-2">No team members listed.</p>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-3">
                  Tap a therapist to prefer them for your booking
                  {preferredStaffId
                    ? ` · ${team.find((t) => t.id === preferredStaffId)?.name || "Selected"}`
                    : ""}
                  .
                </p>
                <div className="booking-team-grid">
                  {team.map((m) => {
                    const selected = preferredStaffId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleTeamCardClick(m.id)}
                        className={`booking-team-card text-left w-full ${
                          selected ? "booking-team-card--selected" : ""
                        }`}
                        aria-pressed={selected}
                      >
                        <div className="booking-team-card__avatar">
                          {m.profilePicture ? (
                            <img src={m.profilePicture} alt="" className="w-full h-full object-cover" />
                          ) : (
                            m.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="font-medium text-slate-800">{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* Good to know */}
          <section className="booking-section">
            <div className="booking-section__header"><div><span className="booking-section__eyebrow">Before you visit</span><h2>Good to know</h2></div></div>
            <a href="#booking-policy" className="flex items-center gap-2 text-slate-700 hover:text-teal-600">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Booking policy
            </a>
          </section>

          {/* Reviews */}
          <section id="reviews" className="booking-section">
            <div className="booking-section__header">
              <div>
                <span className="booking-section__eyebrow">Customer feedback</span>
                <h2>Reviews</h2>
              </div>
            </div>
            {(outlet?.reviews?.length ?? 0) > 0 ? (
              <ul className="space-y-3 mb-4">
                {(outlet?.reviews || []).map((r, i) => (
                  <li key={`${r.author || "r"}-${i}`} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-bold text-slate-800">{r.author || "Guest"}</p>
                      {typeof r.rating === "number" ? (
                        <span className="text-xs font-semibold text-amber-600" aria-label={`${r.rating} of 5 stars`}>
                          {"★".repeat(Math.max(1, Math.min(5, Math.round(r.rating))))}
                          {"☆".repeat(Math.max(0, 5 - Math.min(5, Math.round(r.rating))))}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{r.text}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm mb-4">
                Be the first to review us and share insights about your experience.
              </p>
            )}
            {reviewSuccess ? <p className="text-sm text-emerald-700 mb-3">{reviewSuccess}</p> : null}
            {!showReviewForm ? (
              <button
                type="button"
                onClick={() => {
                  setShowReviewForm(true);
                  setReviewError(null);
                  setReviewSuccess(null);
                  if (currentUserEmail && !reviewAuthor) {
                    setReviewAuthor(currentUserEmail.split("@")[0] || "");
                  }
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-800 font-medium text-sm hover:bg-slate-50"
              >
                Write a review
              </button>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Your name</label>
                  <input
                    type="text"
                    value={reviewAuthor}
                    onChange={(e) => setReviewAuthor(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Rating</label>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} star{n === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Review</label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={3}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Share your experience…"
                  />
                </div>
                {reviewError ? <p className="text-sm text-red-600">{reviewError}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="px-4 py-2 rounded-lg bg-[var(--brand)] text-white font-semibold text-sm disabled:opacity-60"
                  >
                    {reviewSubmitting ? "Submitting…" : "Submit review"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Address + Map */}
          <section id="address" className="booking-section">
            <div className="booking-section__header"><div><span className="booking-section__eyebrow">Location</span><h2>Address</h2></div></div>
            {address ? (
              <>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-700 underline hover:text-teal-600"
                >
                  {address}
                </a>
                <div className="mt-4 rounded-xl overflow-hidden border border-slate-100 bg-slate-100 h-48">
                  <iframe
                    title="Map"
                    src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                    className="w-full h-full"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </>
            ) : (
              <p className="text-slate-500">Address not set.</p>
            )}
          </section>
        </div>

        {/* Right column: sticky sidebar */}
        <aside className="booking-sidebar">
          <div className="booking-summary-card">
            <div className="booking-merchant">
              <span className="booking-merchant__mark" aria-hidden>{(outlet?.name || "B").charAt(0).toUpperCase()}</span>
              <div className="min-w-0">
                <span className="booking-summary__eyebrow">Book with</span>
                <h1 className="booking-merchant__name">{outlet?.name ?? "Booking"}</h1>
                <div className="booking-merchant__meta">
                  <span className={`booking-status ${openClosed.isOpen ? "" : "booking-status--closed"}`}>{openClosed.isOpen ? "Open now" : "Closed"}</span>
                  {address && <span className="truncate">{address}</span>}
                </div>
              </div>
            </div>
            {selectedServices.length === 0 ? (
              <div className="booking-summary__empty"><p className="font-semibold text-slate-800">Start with a service</p><p className="mt-1">Choose one or more services to build your appointment.</p></div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleBookClick}
                  className="booking-primary-button mt-4 w-full"
                >
                  Continue · RM {selectedTotal.toFixed(2)}
                </button>

                {/* Selected Services with Team Member Selection */}
                <div className="booking-summary__list">
                  <h3 className="booking-summary__eyebrow">Selected services</h3>
                  {selectedServices.map((sel) => {
                    const service = sel.service;
                    const selectedTherapistId = serviceTeamMembers[sel.selectionId] || "";
                    return (
                      <div key={sel.selectionId} className="booking-summary__item">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800 text-sm">{service.name}</p>
                            <p className="text-xs text-slate-500">RM {service.price} · {service.duration} min</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSelectedService(sel.selectionId)}
                            className="text-slate-400 hover:text-red-500 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        {/* Team member selection for each pax for this service */}
                        <div className="space-y-2 mt-3">
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">
                              Therapist
                            </label>
                            <select
                              value={selectedTherapistId}
                              onChange={(e) => {
                                const teamMemberId = e.target.value || null;
                                setServiceTeamMember(sel.selectionId, teamMemberId);
                                // Recompute available slots if this is the first selected service
                                if (sel.selectionId === selectedServices[0]?.selectionId && selectedDate) {
                                  fetchAvailableSlots(
                                    selectedDate,
                                    service,
                                    teamMemberId === ANY_AVAILABLE_STAFF ? null : teamMemberId
                                  );
                                }
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                            >
                              <option value="">Select therapist...</option>
                              <option value={ANY_AVAILABLE_STAFF}>Any available</option>
                              {team
                                .filter((member) => {
                                  const qs = member.qualifiedServices;
                                  if (!qs || qs.length === 0) return true;
                                  return qs.includes(service.id);
                                })
                                .map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Operating Hours: dynamic Open/Closed status + expandable 7-day schedule */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setShowHours((prev) => !prev)}
                className="w-full flex items-center justify-between text-sm text-left py-1"
                aria-expanded={showHours}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={openClosed.isOpen ? "text-emerald-600 font-medium" : "text-slate-600"}>
                    {openClosed.isOpen
                      ? `Open – Closes at ${openClosed.closesAt ?? "—"}`
                      : "Closed"}
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform flex-shrink-0 ${showHours ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded: schedule for all 7 days (Monday–Sunday) from businessHours */}
              {showHours && (
                <div className="mt-3 pl-0 text-sm text-slate-600 space-y-1.5">
                  {DAY_ORDER.map((day) => {
                    const hours = outlet?.businessHours?.[day];
                    const openFormatted = hours && hours.isOpen !== false ? formatTimeToAMPM(hours.open) : null;
                    const closeFormatted = hours && hours.isOpen !== false ? formatTimeToAMPM(hours.close) : null;
                    const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
                    const isToday = day === today;
                    return (
                      <div key={day} className="flex justify-between">
                        <span className={isToday ? "font-bold text-slate-800" : ""}>
                          {DAY_LABELS[day] ?? day}
                        </span>
                        <span>
                          {!hours || hours.isOpen === false
                            ? "Closed"
                            : openFormatted && closeFormatted
                            ? `${openFormatted} – ${closeFormatted}`
                            : "—"}
                        </span>
                      </div>
                    );
                  })}
                  <p className="text-xs text-slate-400 pt-1">
                    Time zone {outlet?.timezone ? `(${outlet.timezone})` : "(Malaysia Time)"}
                  </p>
                </div>
              )}
            </div>

            {/* Address in sidebar */}
            {address ? (
              <div className="flex gap-2 text-sm text-slate-600">
                <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                <a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-teal-600">
                  {address}
                </a>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {step === "service" && selectedServices.length > 0 && (
        <BookingStickyAction
          title={`${selectedServices.length} service${selectedServices.length === 1 ? "" : "s"} selected`}
          meta={`RM ${selectedTotal.toFixed(2)} · Choose date and time next`}
          actionLabel="Continue"
          onAction={handleBookClick}
        />
      )}

      {/* Booking flow modal / panel when step is set */}
      {(step === "datetime" || step === "contact") && selectedServices.length > 0 && (
        <div className="booking-modal-backdrop">
          <div className="booking-modal-panel">
            {step === "datetime" && (
              <>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Select date & time</h3>
                
                {/* Selected Services List */}
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Selected Services</p>
                  {selectedServices.map((sel) => (
                    <div key={sel.selectionId} className="flex items-center justify-between py-1">
                      <span className="font-semibold text-slate-800">{sel.service.name}</span>
                      <span className="text-sm text-slate-500">RM {sel.service.price} · {sel.service.duration} min</span>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setStep("service")}
                    className="mt-2 text-xs text-teal-600 hover:text-teal-700 underline"
                  >
                    Change services
                  </button>
                </div>

                {/* Therapist selection per selected service */}
                {selectedServices.length > 0 && team.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Therapists</label>
                    <div className="space-y-4">
                      {selectedServices.map((sel) => {
                        const service = sel.service;
                        const selectedTherapistId = serviceTeamMembers[sel.selectionId] || "";
                        return (
                          <div key={sel.selectionId} className="p-3 border border-slate-200 rounded-lg bg-white">
                            <p className="text-xs font-semibold text-slate-600 mb-2">{service.name}</p>
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">Therapist</label>
                              <select
                                value={selectedTherapistId}
                                onChange={(e) => {
                                  const teamMemberId = e.target.value || null;
                                  setServiceTeamMember(sel.selectionId, teamMemberId);
                                  // Recompute available slots if this is the first selected service
                                  if (sel.selectionId === selectedServices[0]?.selectionId && selectedDate) {
                                    fetchAvailableSlots(
                                      selectedDate,
                                      service,
                                      teamMemberId === ANY_AVAILABLE_STAFF ? null : teamMemberId
                                    );
                                  }
                                }}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                              >
                                <option value="">Select therapist...</option>
                                <option value={ANY_AVAILABLE_STAFF}>Any available</option>
                                {team.map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                <input
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 mb-4 focus:ring-2 focus:ring-teal-500 outline-none"
                />
                <label className="block text-sm font-medium text-slate-700 mb-2">Time</label>
                {slotsLoading ? (
                  <BookingEmptyState title="Checking availability…" description="Finding open times for this date." />
                ) : (
                  (() => {
                    const slots =
                      availableSlots.length > 0
                        ? availableSlots
                        : buildTimeSlotsForDate(selectedDate || todayLocalDate, outlet?.businessHours);
                    if (!selectedDate) {
                      return (
                        <BookingEmptyState title="Pick a date" description="Choose a date to see available times." />
                      );
                    }
                    if (slots.length === 0) {
                      return (
                        <BookingEmptyState
                          title="No availability"
                          description="Try another date or therapist."
                        />
                      );
                    }
                    return (
                      <div className="grid grid-cols-3 gap-2 mb-6">
                        {slots.map((t) => {
                          const slotMinutes = parseTimeToMinutes(t);
                          const isPastSlot =
                            selectedDate === todayLocalDate && slotMinutes <= nowMinutes;
                          return (
                            <button
                              key={t}
                              type="button"
                              disabled={isPastSlot}
                              onClick={() => !isPastSlot && setSelectedTime(t)}
                              className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                                isPastSlot
                                  ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                  : selectedTime === t
                                    ? "bg-teal-600 text-white border-teal-600"
                                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                              }`}
                            >
                              {formatTimeToCompact(t)}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
                <div className="flex gap-2 mt-4">
                  <button type="button" onClick={() => setStep("service")} className="booking-secondary-button flex-1">
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={
                      !selectedDate ||
                      !selectedTime ||
                      selectedServices.some((sel) => {
                        return !serviceTeamMembers[sel.selectionId];
                      })
                    }
                    onClick={() => setStep("contact")}
                    className="booking-primary-button flex-1"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}
            {step === "contact" && (
              <>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Your details</h3>
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <p className="font-semibold text-slate-800">{selectedServices.map((s) => s.service.name).join(", ")}</p>
                  <p className="text-sm text-slate-500">{selectedDate} at {formatTimeToCompact(selectedTime)}</p>
                  <div className="text-xs text-slate-400 mt-2 space-y-1">
                    {selectedServices.map((sel) => {
                      const service = sel.service;
                      const tmId = serviceTeamMembers[sel.selectionId];
                      const member =
                        tmId === ANY_AVAILABLE_STAFF
                          ? { name: "Any available" }
                          : team.find((t) => t.id === tmId);
                      return (
                        <p key={sel.selectionId} className="text-xs text-slate-500">
                          {service.name}: {member?.name || "—"}
                        </p>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                    <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Full name" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email (optional)</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                </div>
                {submitError && <p className="mt-2 text-red-600 text-sm">{submitError}</p>}
                <div className="flex gap-2 mt-6">
                  <button type="button" onClick={() => setStep("datetime")} className="booking-secondary-button flex-1">
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={submitLoading || !customerName.trim() || !phone.trim()}
                    onClick={handleConfirmBooking}
                    className="booking-primary-button flex-1"
                  >
                    {submitLoading ? "Confirming..." : "Confirm Booking"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingPage;
