/**
 * Envoi d'emails (confirmation d'inscription, etc.)
 *
 * Implémentation simple via SMTP avec nodemailer.
 * Si un jour on change de fournisseur (SendGrid, Resend, ...),
 * on pourra remplacer ce fichier sans toucher au reste de l'app.
 * 
 * Les templates d'emails utilisent MJML pour un rendu responsive et professionnel.
 */

import nodemailer from 'nodemailer'
import {
  compileConfirmationTemplate,
  compilePasswordResetTemplate,
} from './emailTemplates/compileTemplate'

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

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    // Options de debug pour voir ce qui se passe
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development',
  })

  return transport
}

export async function sendConfirmationEmail(params: {
  to: string
  confirmationUrl: string
}) {
  const transport = createTransport()
  const { to, confirmationUrl } = params

  // Logger la configuration SMTP (sans le mot de passe)
  if (transport) {
    console.log(`📧 Configuration SMTP: ${SMTP_HOST}:${SMTP_PORT}, utilisateur: ${SMTP_USER}, from: ${SMTP_FROM}`)
  }

  const subject = 'Confirme ton inscription à Yams Online'
  const text = `Bienvenue sur Yams Online !

Merci de ton inscription. Pour activer ton compte, clique sur le lien suivant :
${confirmationUrl}

Si tu n'es pas à l'origine de cette inscription, tu peux ignorer cet email.`

  // Compiler le template MJML en HTML
  let html: string
  try {
    html = compileConfirmationTemplate(confirmationUrl)
  } catch (error) {
    console.error('❌ Erreur lors de la compilation du template MJML:', error)
    // Fallback vers un HTML simple en cas d'erreur
    html = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6;">
        <h2>Bienvenue sur Yams Online 🎲</h2>
        <p>Merci de ton inscription ! Pour activer ton compte, clique sur le lien suivant :</p>
        <p><a href="${confirmationUrl}">${confirmationUrl}</a></p>
      </div>
    `
  }

  // Mode "fallback": si pas de SMTP, log en console
  if (!transport) {
    console.warn('⚠️ SMTP non configuré. Les emails seront simplement logués en console.')
    console.log('📧 [DEV] Email de confirmation (non envoyé - SMTP non configuré)')
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('URL:', confirmationUrl)
    return
  }

  try {
    // Vérifier la connexion SMTP avant d'envoyer
    console.log(`🔍 Vérification de la connexion SMTP (${SMTP_HOST}:${SMTP_PORT})...`)
    await transport.verify()
    console.log(`✅ Connexion SMTP vérifiée avec succès`)

    // Envoyer l'email
    const info = await transport.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text,
      html,
    })

    console.log(`✅ Email de confirmation envoyé à ${to}`)
    console.log(`📧 Message ID: ${info.messageId || 'Non fourni'}`)
    console.log(`📧 Réponse du serveur: ${info.response || 'Aucune réponse'}`)
    console.log(`📧 Accepted: ${info.accepted?.join(', ') || 'Aucun'}`)
    console.log(`📧 Rejected: ${info.rejected?.join(', ') || 'Aucun'}`)
    
    // Vérifications supplémentaires
    if (!info.messageId) {
      console.warn('⚠️ Attention: Le serveur SMTP n\'a pas retourné de messageId. L\'email pourrait ne pas avoir été envoyé.')
    }
    
    if (info.rejected && info.rejected.length > 0) {
      console.error(`❌ L'adresse email ${to} a été rejetée par le serveur SMTP`)
    }
    
    if (info.accepted && info.accepted.length === 0) {
      console.error(`❌ Aucune adresse email n'a été acceptée par le serveur SMTP`)
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de confirmation:', error)
    if (error instanceof Error) {
      console.error('❌ Détails de l\'erreur:', error.message)
      if ('code' in error) {
        console.error('❌ Code d\'erreur:', error.code)
      }
    }
    // Ne pas throw pour ne pas faire échouer la création du compte
    // L'utilisateur peut toujours vérifier son email plus tard
  }
}

export async function sendPasswordResetEmail(params: {
  to: string
  resetUrl: string
}) {
  const transport = createTransport()
  const { to, resetUrl } = params

  // Logger la configuration SMTP (sans le mot de passe)
  if (transport) {
    console.log(`📧 Configuration SMTP: ${SMTP_HOST}:${SMTP_PORT}, utilisateur: ${SMTP_USER}, from: ${SMTP_FROM}`)
  }

  const subject = 'Réinitialisation de ton mot de passe Yams Online'
  const text = `Tu as demandé à réinitialiser ton mot de passe Yams Online.

Pour définir un nouveau mot de passe, clique sur le lien suivant :
${resetUrl}

Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email.`

  // Compiler le template MJML en HTML
  let html: string
  try {
    html = compilePasswordResetTemplate(resetUrl)
  } catch (error) {
    console.error('❌ Erreur lors de la compilation du template MJML:', error)
    // Fallback vers un HTML simple en cas d'erreur
    html = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6;">
        <h2>Réinitialisation de ton mot de passe 🔑</h2>
        <p>Tu as demandé à réinitialiser ton mot de passe. Clique sur le lien suivant :</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
      </div>
    `
  }

  if (!transport) {
    console.warn('⚠️ SMTP non configuré. Les emails seront simplement logués en console.')
    console.log('📧 [DEV] Email de reset de mot de passe (non envoyé - SMTP non configuré)')
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('URL:', resetUrl)
    return
  }

  try {
    // Vérifier la connexion SMTP avant d'envoyer
    console.log(`🔍 Vérification de la connexion SMTP (${SMTP_HOST}:${SMTP_PORT})...`)
    await transport.verify()
    console.log(`✅ Connexion SMTP vérifiée avec succès`)

    // Envoyer l'email
    const info = await transport.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text,
      html,
    })

    console.log(`✅ Email de réinitialisation envoyé à ${to}`)
    console.log(`📧 Message ID: ${info.messageId || 'Non fourni'}`)
    console.log(`📧 Réponse du serveur: ${info.response || 'Aucune réponse'}`)
    console.log(`📧 Accepted: ${info.accepted?.join(', ') || 'Aucun'}`)
    console.log(`📧 Rejected: ${info.rejected?.join(', ') || 'Aucun'}`)
    
    // Vérifications supplémentaires
    if (!info.messageId) {
      console.warn('⚠️ Attention: Le serveur SMTP n\'a pas retourné de messageId. L\'email pourrait ne pas avoir été envoyé.')
    }
    
    if (info.rejected && info.rejected.length > 0) {
      console.error(`❌ L'adresse email ${to} a été rejetée par le serveur SMTP`)
    }
    
    if (info.accepted && info.accepted.length === 0) {
      console.error(`❌ Aucune adresse email n'a été acceptée par le serveur SMTP`)
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de réinitialisation:', error)
    if (error instanceof Error) {
      console.error('❌ Détails de l\'erreur:', error.message)
      if ('code' in error) {
        console.error('❌ Code d\'erreur:', error.code)
      }
    }
    // Ne pas throw pour ne pas faire échouer la demande de reset
  }
}


