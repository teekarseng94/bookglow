import React from "react";
export default function AccessStatePage({ title, message }: { title: string; message: string }) {
  return <main className="bookglow-login"><section className="bookglow-login__form-side"><div className="bookglow-login__card"><h1>{title}</h1><p>{message}</p><a href="/login">Return to merchant login</a></div></section></main>;
}
