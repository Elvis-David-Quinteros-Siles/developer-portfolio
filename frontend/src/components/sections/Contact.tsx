import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, Loader2, Mail, MapPin, Send, Timer } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { SectionHeading } from "@/components/layout/SectionHeading";
import { Parallax, ParallaxGlow, ParallaxWatermark } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContactMutation, useProfile } from "@/hooks/usePortfolioData";
import { ApiError } from "@/lib/api";

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(120, "El nombre no puede superar 120 caracteres"),
  email: z.email("Introduce un email válido"),
  subject: z
    .string()
    .trim()
    .min(3, "El asunto debe tener al menos 3 caracteres")
    .max(200, "El asunto no puede superar 200 caracteres"),
  message: z
    .string()
    .trim()
    .min(10, "El mensaje debe tener al menos 10 caracteres")
    .max(5000, "El mensaje no puede superar 5000 caracteres"),
  /** Honeypot: campo invisible para humanos; si llega relleno, es un bot. */
  website: z.string().max(0, "").optional(),
});

type ContactForm = z.infer<typeof contactSchema>;

interface ContactProps {
  /**
   * Preparado para ReCaptcha: si se provee, se obtiene un token antes de
   * enviar y viaja como `recaptcha_token` (Django lo verifica si está
   * configurado — CONTRACTS.md §6).
   */
  getRecaptchaToken?: () => Promise<string>;
}

export function Contact({ getRecaptchaToken }: ContactProps) {
  const { data: profile } = useProfile();
  const mutation = useContactMutation();
  const [botTrapped, setBotTrapped] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    // Valida al salir de cada campo (no en cada tecla ni solo al enviar)
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
      website: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    // Honeypot relleno: se simula éxito sin tocar la API
    if (values.website) {
      setBotTrapped(true);
      return;
    }
    const recaptcha_token = getRecaptchaToken ? await getRecaptchaToken() : undefined;
    await mutation
      .mutateAsync({
        name: values.name,
        email: values.email,
        subject: values.subject,
        message: values.message,
        ...(recaptcha_token ? { recaptcha_token } : {}),
      })
      .then(() => reset())
      .catch(() => {
        // el estado de error lo gestiona la mutación
      });
  });

  const isRateLimited = mutation.error instanceof ApiError && mutation.error.status === 429;
  const sending = isSubmitting || mutation.isPending;
  const success = mutation.isSuccess || botTrapped;

  return (
    <section
      id="contact"
      aria-label="Contacto"
      className="relative scroll-mt-20 overflow-hidden bg-surface/30"
    >
      <ParallaxWatermark text="08" />
      <ParallaxGlow tone="violet" className="bottom-0 left-1/2 -translate-x-1/2" speed={0.35} />
      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHeading
          eyebrow="08 · contacto"
          title="Hablemos"
          description="¿Un proyecto, una vacante o una duda de arquitectura? Respondo en menos de 48h."
        />

        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <div className="space-y-6">
              <p className="leading-relaxed text-muted">
                El mensaje viaja por la plataforma completa: gateway con rate limiting, validación
                en Go, persistencia en Django y notificación asíncrona vía Celery. Sí, un formulario
                de contacto con arquitectura de microservicios — este portfolio predica con el
                ejemplo.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-line bg-raised text-accent">
                    <Mail className="size-4" aria-hidden="true" />
                  </span>
                  <a href={`mailto:${profile.email}`} className="text-muted hover:text-accent">
                    {profile.email}
                  </a>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-line bg-raised text-accent">
                    <MapPin className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-muted">{profile.location} · remoto friendly</span>
                </li>
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <Parallax speed={-0.06}>
              <Card>
                <CardContent className="p-6 sm:p-8">
                  {success ? (
                    <div
                      role="status"
                      className="flex flex-col items-center gap-3 py-10 text-center"
                    >
                      <CheckCircle2 className="size-12 text-success" aria-hidden="true" />
                      <h3 className="text-lg font-semibold text-ink">Mensaje enviado</h3>
                      <p className="max-w-sm text-sm text-muted">
                        Gracias por escribir. Tu mensaje ya está en la cola — te responderé pronto.
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          mutation.reset();
                          setBotTrapped(false);
                        }}
                      >
                        Enviar otro mensaje
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={(e) => void onSubmit(e)} noValidate>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="contact-name">Nombre</Label>
                          <Input
                            id="contact-name"
                            autoComplete="name"
                            placeholder="Tu nombre"
                            aria-invalid={Boolean(errors.name)}
                            aria-describedby={errors.name ? "contact-name-error" : undefined}
                            {...register("name")}
                          />
                          {errors.name && (
                            <p
                              id="contact-name-error"
                              role="alert"
                              className="mt-1.5 text-xs text-danger"
                            >
                              {errors.name.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="contact-email">Email</Label>
                          <Input
                            id="contact-email"
                            type="email"
                            autoComplete="email"
                            placeholder="tu@email.com"
                            aria-invalid={Boolean(errors.email)}
                            aria-describedby={errors.email ? "contact-email-error" : undefined}
                            {...register("email")}
                          />
                          {errors.email && (
                            <p
                              id="contact-email-error"
                              role="alert"
                              className="mt-1.5 text-xs text-danger"
                            >
                              {errors.email.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-5">
                        <Label htmlFor="contact-subject">Asunto</Label>
                        <Input
                          id="contact-subject"
                          placeholder="¿De qué quieres hablar?"
                          aria-invalid={Boolean(errors.subject)}
                          aria-describedby={errors.subject ? "contact-subject-error" : undefined}
                          {...register("subject")}
                        />
                        {errors.subject && (
                          <p
                            id="contact-subject-error"
                            role="alert"
                            className="mt-1.5 text-xs text-danger"
                          >
                            {errors.subject.message}
                          </p>
                        )}
                      </div>

                      <div className="mt-5">
                        <Label htmlFor="contact-message">Mensaje</Label>
                        <Textarea
                          id="contact-message"
                          placeholder="Cuéntame sobre tu proyecto o propuesta…"
                          aria-invalid={Boolean(errors.message)}
                          aria-describedby={errors.message ? "contact-message-error" : undefined}
                          {...register("message")}
                        />
                        {errors.message && (
                          <p
                            id="contact-message-error"
                            role="alert"
                            className="mt-1.5 text-xs text-danger"
                          >
                            {errors.message.message}
                          </p>
                        )}
                      </div>

                      {/* Honeypot: oculto para humanos, irresistible para bots */}
                      <div className="sr-only" aria-hidden="true">
                        <label htmlFor="contact-website">No rellenes este campo</label>
                        <input
                          id="contact-website"
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          {...register("website")}
                        />
                      </div>

                      {mutation.isError && (
                        <div
                          role="alert"
                          className="mt-5 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/10 p-3.5 text-sm text-danger"
                        >
                          {isRateLimited ? (
                            <>
                              <Timer className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                              <span>
                                Has enviado demasiados mensajes en poco tiempo. El rate limit del
                                gateway está haciendo su trabajo — espera un minuto y vuelve a
                                intentarlo.
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle
                                className="mt-0.5 size-4 shrink-0"
                                aria-hidden="true"
                              />
                              <span>
                                No se pudo enviar el mensaje. Inténtalo de nuevo o escríbeme
                                directamente a {profile.email}.
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      <Button type="submit" size="lg" className="mt-6 w-full" disabled={sending}>
                        {sending ? (
                          <>
                            <Loader2 className="animate-spin" aria-hidden="true" />
                            Enviando…
                          </>
                        ) : (
                          <>
                            <Send aria-hidden="true" />
                            Enviar mensaje
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </Parallax>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
