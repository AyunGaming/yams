/**
 * Envoi d'emails (confirmation d'inscription, etc.)
 *
 * Implémentation simple via SMTP avec nodemailer.
 * Si un jour on change de fournisseur (SendGrid, Resend, ...),
 * on pourra remplacer ce fichier sans toucher au reste de l'app.
 */

import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@yams.local'

function createTransport() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('⚠️ SMTP non configuré. Les emails seront simplement logués en console.')
    return null
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  })
}

export async function sendConfirmationEmail(params: {
  to: string
  confirmationUrl: string
}) {
  const transport = createTransport()
  const { to, confirmationUrl } = params

  const subject = 'Confirme ton inscription à Yams Online'
  const text = `Bienvenue sur Yams Online !

Merci de ton inscription. Pour activer ton compte, clique sur le lien suivant :
${confirmationUrl}

Si tu n'es pas à l'origine de cette inscription, tu peux ignorer cet email.`

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6;">
      <h2>Bienvenue sur Yams Online 🎲</h2>
      <p>Merci de ton inscription ! Pour activer ton compte, clique sur le bouton ci-dessous :</p>
      <p style="margin: 24px 0;">
        <a href="${confirmationUrl}"
           style="background-color: #4f46e5; color: #ffffff; padding: 10px 18px; border-radius: 999px; text-decoration: none; font-weight: 600;">
          Confirmer mon adresse email
        </a>
      </p>
      <p>Ou copie-colle ce lien dans ton navigateur :</p>
      <p style="word-break: break-all; color: #374151;">${confirmationUrl}</p>
      <hr style="margin: 24px 0; border-color: #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">
        Si tu n'es pas à l'origine de cette inscription, tu peux ignorer cet email.
      </p>
    </div>
  `

  // Mode "fallback": si pas de SMTP, log en console
  if (!transport) {
    console.log('📧 [DEV] Email de confirmation (non envoyé - SMTP non configuré)')
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('URL:', confirmationUrl)
    return
  }

  await transport.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html,
  })
}

export async function sendPasswordResetEmail(params: {
  to: string
  resetUrl: string
}) {
  const transport = createTransport()
  const { to, resetUrl } = params

  const subject = 'Réinitialisation de ton mot de passe Yams Online'
  const text = `Tu as demandé à réinitialiser ton mot de passe Yams Online.

Pour définir un nouveau mot de passe, clique sur le lien suivant :
${resetUrl}

Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email.`

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6;">
      <h2>Réinitialisation de ton mot de passe 🔑</h2>
      <p>Tu as demandé à réinitialiser ton mot de passe. Clique sur le bouton ci-dessous pour en choisir un nouveau :</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}"
           style="background-color: #4f46e5; color: #ffffff; padding: 10px 18px; border-radius: 999px; text-decoration: none; font-weight: 600;">
          Définir un nouveau mot de passe
        </a>
      </p>
      <p>Ou copie-colle ce lien dans ton navigateur :</p>
      <p style="word-break: break-all; color: #374151;">${resetUrl}</p>
      <hr style="margin: 24px 0; border-color: #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">
        Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email.
      </p>
    </div>
  `

  if (!transport) {
    console.log('📧 [DEV] Email de reset de mot de passe (non envoyé - SMTP non configuré)')
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('URL:', resetUrl)
    return
  }

  await transport.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html,
  })
}


