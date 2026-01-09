/**
 * Envoi d'emails (confirmation d'inscription, etc.)
 *
 * Implémentation via SendGrid API.
 * Si un jour on change de fournisseur (Resend, AWS SES, ...),
 * on pourra remplacer ce fichier sans toucher au reste de l'app.
 * 
 * Les templates d'emails utilisent MJML pour un rendu responsive et professionnel.
 */

import * as sgMail from '@sendgrid/mail'
import {
  compileConfirmationTemplate,
  compilePasswordResetTemplate,
} from './emailTemplates/compileTemplate'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'no-reply@yams.local'

// Initialiser SendGrid avec la clé API
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY)
} else {
  console.warn('⚠️ SENDGRID_API_KEY non configurée. Les emails seront simplement logués en console.')
}

export async function sendConfirmationEmail(params: {
  to: string
  confirmationUrl: string
}) {
  const { to, confirmationUrl } = params

  // Vérifier que SendGrid est configuré
  if (!SENDGRID_API_KEY) {
    console.warn('⚠️ SENDGRID_API_KEY non configurée. Les emails seront simplement logués en console.')
    return
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

  try {
    // Envoyer l'email via SendGrid
    const msg = {
      to,
      from: SENDGRID_FROM_EMAIL,
      subject,
      text,
      html,
    }

    await sgMail.send(msg)
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de confirmation:', error)
    
    // Gestion spécifique des erreurs SendGrid
    if (error && typeof error === 'object' && 'response' in error && error.response) {
      const sgError = error.response as { 
        body?: { 
          errors?: Array<{ message?: string; field?: string }> 
        } 
      }
      
      if (sgError.body?.errors) {
        const errors = sgError.body.errors
        console.error('❌ Erreurs SendGrid:', errors)
        
        // Vérifier si c'est une erreur d'identité d'expéditeur non vérifiée
        const senderIdentityError = errors.find(
          (e) => e.message?.includes('verified Sender Identity') || e.field === 'from'
        )
        
        if (senderIdentityError) {
          console.error('❌ ERREUR CRITIQUE: L\'adresse email d\'expéditeur n\'est pas vérifiée dans SendGrid.')
          console.error('❌ Vérifie que SENDGRID_FROM_EMAIL correspond à une adresse vérifiée dans SendGrid.')
          console.error('❌ Consulte: https://sendgrid.com/docs/for-developers/sending-email/sender-identity/')
        }
      }
    }
    
    if (error instanceof Error) {
      console.error('❌ Détails de l\'erreur:', error.message)
      if ('code' in error) {
        console.error('❌ Code d\'erreur:', error.code)
      }
    }
    
    // Propager l'erreur pour que la route API puisse la gérer
    throw error
  }
}

export async function sendPasswordResetEmail(params: {
  to: string
  resetUrl: string
}) {
  const { to, resetUrl } = params

  // Vérifier que SendGrid est configuré
  if (!SENDGRID_API_KEY) {
    console.warn('⚠️ SENDGRID_API_KEY non configurée. Les emails seront simplement logués en console.')
    return
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

  try {
    // Envoyer l'email via SendGrid
    const msg = {
      to,
      from: SENDGRID_FROM_EMAIL,
      subject,
      text,
      html,
    }

    await sgMail.send(msg)
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de réinitialisation:', error)
    
    // Gestion spécifique des erreurs SendGrid
    if (error && typeof error === 'object' && 'response' in error && error.response) {
      const sgError = error.response as { 
        body?: { 
          errors?: Array<{ message?: string; field?: string }> 
        } 
      }
      
      if (sgError.body?.errors) {
        const errors = sgError.body.errors
        console.error('❌ Erreurs SendGrid:', errors)
        
        // Vérifier si c'est une erreur d'identité d'expéditeur non vérifiée
        const senderIdentityError = errors.find(
          (e) => e.message?.includes('verified Sender Identity') || e.field === 'from'
        )
        
        if (senderIdentityError) {
          console.error('❌ ERREUR CRITIQUE: L\'adresse email d\'expéditeur n\'est pas vérifiée dans SendGrid.')
          console.error('❌ Vérifie que SENDGRID_FROM_EMAIL correspond à une adresse vérifiée dans SendGrid.')
          console.error('❌ Consulte: https://sendgrid.com/docs/for-developers/sending-email/sender-identity/')
        }
      }
    }
    
    if (error instanceof Error) {
      console.error('❌ Détails de l\'erreur:', error.message)
      if ('code' in error) {
        console.error('❌ Code d\'erreur:', error.code)
      }
    }
    
    // Propager l'erreur pour que la route API puisse la gérer
    throw error
  }
}


