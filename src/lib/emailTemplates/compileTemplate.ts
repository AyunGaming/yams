/**
 * Compile les templates MJML en HTML
 */

import mjml from 'mjml' 
import {
  confirmationTemplate,
  passwordResetTemplate,
} from './templates'

interface TemplateVariables {
  [key: string]: string
}

/**
 * Compile un template MJML avec des variables
 */
function compileMjmlTemplate(
  templateContent: string,
  variables: TemplateVariables
): string {
  // Si mjml n'est pas disponible, retourner null pour utiliser le fallback
  if (!mjml) {
    throw new Error('MJML non disponible')
  }

  // Remplacer les variables {{variableName}} par leurs valeurs
  let compiledTemplate = templateContent
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    compiledTemplate = compiledTemplate.replace(regex, value)
  }
  
  // Compiler MJML en HTML
  let html: string
  try {
    const result = mjml(compiledTemplate, {
      validationLevel: 'soft',
    })
    
    if (result.errors && result.errors.length > 0) {
      console.warn('⚠️ Avertissements lors de la compilation MJML:', result.errors)
    }
    
    html = result.html
  } catch (error) {
    throw new Error(
      `Erreur lors de la compilation MJML: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
  
  return html
}

/**
 * Compile le template de confirmation d'inscription
 */
export function compileConfirmationTemplate(confirmationUrl: string): string {
  return compileMjmlTemplate(confirmationTemplate, { confirmationUrl })
}

/**
 * Compile le template de reset de mot de passe
 */
export function compilePasswordResetTemplate(resetUrl: string): string {
  return compileMjmlTemplate(passwordResetTemplate, { resetUrl })
}

