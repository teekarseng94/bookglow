/**
 * Public Booking Portal: /book/:outletId
 * Two-column layout: left = Services, Team, Good to know, Reviews, Address + map; right = sticky sidebar with name, Book, Open/Closed, hours, address.
 * Real-time Firestore listener for outlets/{outletId} to sync addressDisplay, phoneNumber, businessHours.
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../services/firebase";
import {
  getPublicOutletData,
  createPublicBooking,
  getAvailableSlots,
  PublicService,
  PublicOutlet,
  PublicTeamMember,
} from "../../services/bookingApi";

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
  const { outletId: outletIdParam } = useParams<{ outletId: string }>();
  const navigate = useNavigate();
  const outletId = outletIdParam ?? "";
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

  // Watch Firebase Auth state so we can show the signed-in email in the header
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUserEmail(null);
        return;
      }

      // Booking-site auth should map to customers/{uid}; staff-only users live in users/{uid}.
      const customerSnap = await getDoc(doc(db, "customers", user.uid));
      setCurrentUserEmail(customerSnap.exists() ? user.email ?? null : null);
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
        // If teamMemberId is provided and not empty, filter slots by that member's availability
        // Otherwise, show all available slots
        const payload: any = {
          outletId,
          serviceId: service.id,
          date: targetDate,
        };
        // Only include staffId if it's a non-empty string
        if (teamMemberId && teamMemberId.trim().length > 0) {
          payload.staffId = teamMemberId.trim();
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
      [selectionId]: null,
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
    
    // Find team member name for logging
    const teamMember = teamMemberId ? team.find((t) => t.id === teamMemberId) : null;
    const sel = selectedServices.find((s) => s.selectionId === selectionId);
    console.log(`[Team Selection] Service: ${sel?.service?.name || selectionId}, Selected: ${teamMember?.name || teamMemberId || 'None'}`);
    
    setServiceTeamMembers({
      ...serviceTeamMembers,
      [selectionId]: teamMemberId,
    });
  };

  // Real-time listener: PRIMARY source for outlet data (addressDisplay, businessHours, etc.)
  // This listener runs immediately on mount and keeps data in sync with Firestore
  useEffect(() => {
    if (!outletId) {
      setError("Missing outlet");
      setLoading(false);
      return;
    }

    let hasReceivedData = false;
    const outletRef = doc(db, "outlets", outletId);
    const unsubscribe = onSnapshot(
      outletRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          // Fallback to Cloud Function if document doesn't exist or listener fails
          if (!hasReceivedData) {
            getPublicOutletData(outletId)
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
                setError((e as Error)?.message || "Failed to load outlet");
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
        });
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore listener error for outlet:", err);
        // Fallback to Cloud Function if listener fails (e.g., permission denied)
        if (!hasReceivedData) {
          getPublicOutletData(outletId)
            .then(({ outlet: o }) => {
              if (o) {
                setOutlet(o);
                setLoading(false);
                setError(null);
              } else {
                setError(err.message || "Failed to load outlet");
                setLoading(false);
              }
            })
            .catch((e: unknown) => {
              setError((e as Error)?.message || "Failed to load outlet");
              setLoading(false);
            });
        }
      }
    );

    return () => unsubscribe();
  }, [outletId]);

  // Real-time listener: services for this outlet (keeps booking list in sync with backend Services)
  useEffect(() => {
    if (!outletId) return;

    const servicesRef = collection(db, "services");
    const servicesQuery = query(
      servicesRef,
      where("outletID", "==", outletId),
      orderBy("name", "asc")
    );

    const unsubscribe = onSnapshot(
      servicesQuery,
      (snapshot) => {
        const nextServices: PublicService[] = snapshot.docs
          .map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              doc: d,
              data: {
                id: d.id,
                name: (data.name as string) || "",
                price: (data.price as number) ?? 0,
                duration: (data.duration as number) ?? 60,
                category: (data.category as string) || "",
                isPromotion: (data.isPromotion as boolean) ?? false,
              },
              isVisible: data.isVisible !== false,
            };
          })
          .filter((item) => item.isVisible)
          .map((item) => item.data);
        setServices(nextServices);
      },
      (err) => {
        console.error("Firestore listener error for services:", err);
      }
    );

    return () => unsubscribe();
  }, [outletId]);

  // Real-time listener: team for this outlet
  useEffect(() => {
    if (!outletId) return;

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
    fetchAvailableSlots(selectedDate, firstService, selectedTeamMemberId);
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
    // Validate therapist selection for all selected service rows
    const missingTherapist = selectedServices.some((sel) => !serviceTeamMembers[sel.selectionId]);
    if (missingTherapist) {
      setSubmitError("Please select a therapist for each selected service.");
      return;
    }
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      // Debug: Log full state before booking
      console.log(`[Booking] Full state before submission:`, {
        selectedServices: selectedServices.map((s) => ({ selectionId: s.selectionId, id: s.service.id, name: s.service.name })),
        serviceTeamMembers,
        team: team.map((t) => ({ id: t.id, name: t.name })),
      });
      
      // Create bookings: one booking per selected service row (duplicates allowed)
      const bookingPromises = [];
      for (const sel of selectedServices) {
        const service = sel.service;
        const teamMemberId = serviceTeamMembers[sel.selectionId] || null;
        console.log(`[Booking] Service: ${service.name} (${service.id}) [${sel.selectionId}], Therapist:`, teamMemberId);
        if (!teamMemberId) continue;
          
        // Find team member name for logging
        const teamMember = team.find((t) => t.id === teamMemberId);
        if (!teamMember) {
          console.error(`[Booking] ERROR: Team member ID ${teamMemberId} not found in team list! Available team members:`, team.map((t) => ({ id: t.id, name: t.name })));
          setSubmitError(`Invalid therapist selected. Please try again.`);
          setSubmitLoading(false);
          return;
        }
        console.log(`[Booking] Creating booking for service "${service.name}", therapist: ${teamMember.name} (ID: ${teamMemberId})`);
          
        bookingPromises.push(
          createPublicBooking({
            outletId,
            serviceId: service.id,
            date: selectedDate,
            time: selectedTime,
            customerName: customerName.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
            staffId: teamMemberId, // selected therapist
          })
        );
      }
      const results = await Promise.all(bookingPromises);
      setBookingId(results[0]?.appointmentId || "confirmed");
    } catch (e: unknown) {
      console.error("[Booking] Error creating booking:", e);
      setSubmitError((e as Error)?.message || "Booking failed.");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-md text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-slate-500 mt-2">Check the link or try again later.</p>
        </div>
      </div>
    );
  }

  if (bookingId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Booking confirmed</h2>
          <p className="text-slate-600 mt-2">We look forward to seeing you at {outlet?.name}.</p>
          <p className="text-sm text-slate-500 mt-4">
            {selectedServices.map((s) => s.service.name).join(", ")} · {selectedDate} at {formatTimeToCompact(selectedTime)}
          </p>
        </div>
      </div>
    );
  }

  const address = outlet?.addressDisplay ?? "";
  const mapQuery = encodeURIComponent(address);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav: Services, Team, Reviews, Address */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex gap-6 text-sm font-medium text-slate-600">
            <a href="#services" className="text-slate-900 border-b-2 border-slate-900 pb-1">Services</a>
            <a href="#team" className="hover:text-slate-900">Team</a>
            <a href="#reviews" className="hover:text-slate-900">Reviews</a>
            <a href="#address" className="hover:text-slate-900">Address</a>
          </div>

          {/* Top-right actions: Share + Login */}
          <div className="flex items-center gap-3">
            {currentUserEmail && (
              <span className="hidden sm:inline text-xs font-medium text-slate-600">
                {currentUserEmail}
              </span>
            )}
            {/* Share this page */}
            <button
              type="button"
              onClick={handleShare}
              disabled={shareLoading}
              className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors group disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Share this page"
            >
              <svg
                className={`w-5 h-5 ${shareLoading ? "animate-pulse" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4m0 0L8 6m4-4v16"
                />
              </svg>
              <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-9 whitespace-nowrap rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-600 shadow-md border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                Share this page
              </span>
            </button>

            {/* Login */}
            <button
              type="button"
              onClick={() =>
                navigate(`/book/${outletIdParam ?? outlet?.outletId ?? ""}/auth?loginSource=homepage`)
              }
              className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors group"
              aria-label="Login"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.121 17.804A7 7 0 0112 15a7 7 0 016.879 2.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-9 whitespace-nowrap rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-600 shadow-md border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                Login
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Simple toast for share fallback */}
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <div className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-medium shadow-lg shadow-slate-900/30">
            {shareToast}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        {/* Left column: scrollable content */}
        <div className="flex-1 min-w-0 space-y-6 order-2 lg:order-1">
          {/* Services */}
          <section id="services" className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Services</h2>

            {services.length > 0 && (
              <>
                {/* Mobile / tablet header (unchanged layout) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 lg:hidden">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        selectedCategory == null
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          selectedCategory === cat
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="relative flex-1 max-w-xs">
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
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        selectedCategory == null
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:-translate-y-px"
                      }`}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                          selectedCategory === cat
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:-translate-y-px"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-end flex-1">
                    <div className="relative w-full max-w-sm">
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
              <p className="text-slate-500 py-4">No treatments available.</p>
            ) : filteredServices.length === 0 ? (
              <p className="text-slate-500 py-4">No services match the selected filter or search.</p>
            ) : (
              <div className="space-y-3">
                {filteredServices.map((s) => {
                  const selectedCount = selectedServices.filter((sel) => sel.service.id === s.id).length;
                  const isSelected = selectedCount > 0;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-colors cursor-pointer group ${
                        isSelected
                          ? "border-teal-500 bg-teal-50"
                          : "border-slate-100 hover:border-slate-200"
                      }`}
                      onClick={() => handleServiceClick(s)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                          isSelected ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-500"
                        }`}>
                          {isSelected ? "✓" : "🌿"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{s.name}</p>
                          <p className="text-sm text-slate-500">{s.duration} min · {s.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedCount > 1 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 border border-teal-200">
                            x{selectedCount}
                          </span>
                        )}
                        <span className="font-bold text-slate-800">{s.price ? `RM ${s.price}` : "Free"}</span>
                        {isSelected ? (
                          <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Team */}
          <section id="team" className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Team</h2>
            {team.length === 0 ? (
              <p className="text-slate-500 py-2">No team members listed.</p>
            ) : (
              <div className="space-y-2">
                {team.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold overflow-hidden flex-shrink-0">
                      {m.profilePicture ? (
                        <img src={m.profilePicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        m.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="font-medium text-slate-800">{m.name}</span>
                    <svg className="w-4 h-4 text-slate-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Good to know */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Good to know</h2>
            <a href="#booking-policy" className="flex items-center gap-2 text-slate-700 hover:text-teal-600">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Booking policy
            </a>
          </section>

          {/* Reviews */}
          <section id="reviews" className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Reviews</h2>
            <p className="text-slate-500 text-sm mb-4">Be the first to review us and share insights about your experience.</p>
            <button type="button" className="px-4 py-2 rounded-lg border border-slate-300 text-slate-800 font-medium text-sm hover:bg-slate-50">
              Write a review
            </button>
          </section>

          {/* Address + Map */}
          <section id="address" className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Address</h2>
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
        <aside className="lg:w-80 flex-shrink-0 order-1 lg:order-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sticky top-24 space-y-6">
            <h1 className="text-xl font-bold text-slate-900">{outlet?.name ?? "Booking"}</h1>
            {selectedServices.length === 0 ? (
              <p className="text-sm text-slate-500">
                No services selected yet. Choose a treatment on the left to begin your booking.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleBookClick}
                  className="w-full py-4 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
                >
                  Book
                </button>

                {/* Selected Services with Team Member Selection */}
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Selected Services</h3>
                  {selectedServices.map((sel) => {
                    const service = sel.service;
                    const selectedTherapistId = serviceTeamMembers[sel.selectionId] || "";
                    return (
                      <div key={sel.selectionId} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
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
                                  fetchAvailableSlots(selectedDate, service, teamMemberId);
                                }
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                            >
                              <option value="">Select therapist...</option>
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

      {/* Booking flow modal / panel when step is set */}
      {(step === "datetime" || step === "contact") && selectedServices.length > 0 && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
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
                                    fetchAvailableSlots(selectedDate, service, teamMemberId);
                                  }
                                }}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                              >
                                <option value="">Select therapist...</option>
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
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {(
                    availableSlots.length > 0
                      ? availableSlots
                      : buildTimeSlotsForDate(
                          selectedDate || todayLocalDate,
                          outlet?.businessHours
                        )
                  ).map((t) => {
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
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep("service")} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium">
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
                    className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
                      const member = team.find((t) => t.id === tmId);
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
                  <button type="button" onClick={() => setStep("datetime")} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium">
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={submitLoading || !customerName.trim() || !phone.trim()}
                    onClick={handleConfirmBooking}
                    className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
