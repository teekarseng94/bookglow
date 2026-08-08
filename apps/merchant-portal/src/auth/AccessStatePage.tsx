import React from "react";
import { logout } from "../../services/authService";

export default function AccessStatePage({ title, message, noWorkspace = false }: { title: string; message: string; noWorkspace?: boolean }) {
  const customerSiteUrl = ((import.meta.env as unknown as Record<string, string | undefined>).VITE_CUSTOMER_SITE_URL || "http://localhost:5174").replace(/\/$/, "");
  const signOut = async () => { await logout(); window.location.replace("/#/login"); };
  return <main className="bookglow-login bookglow-login--access"><section className="bookglow-login__form-side"><div className="bookglow-login__card"><span className="bookglow-login__eyebrow">Bookglow merchant</span><h1>{title}</h1><p>{message}</p><div className="bookglow-access__actions">{noWorkspace && <a className="bookglow-access__primary" href={`${customerSiteUrl}/signup`}>Create your business</a>}<button className="bookglow-access__secondary" type="button" onClick={() => void signOut()}>Sign out</button></div></div></section></main>;
}
