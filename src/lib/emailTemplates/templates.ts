/**
 * Templates MJML intégrés comme constantes TypeScript
 * Cela garantit qu'ils sont toujours disponibles, même en mode standalone
 */

export const confirmationTemplate = `<mjml>
  <mj-head>
    <mj-title>Confirme ton inscription à Yams Online</mj-title>
  </mj-head>
  <mj-body background-color="#f3f4f6">
    <mj-section background-color="#ffffff" padding="40px 20px">
      <mj-column>
        <mj-text align="center" font-size="32px" font-weight="bold" color="#1f2937" padding-bottom="20px">
          🎲 Bienvenue sur Yams Online !
        </mj-text>
        <mj-text font-size="16px" color="#374151" line-height="1.6" padding-bottom="20px">
          Merci de ton inscription ! Pour activer ton compte et commencer à jouer, clique sur le bouton ci-dessous pour confirmer ton adresse email.
        </mj-text>
        <mj-button 
          background-color="#4f46e5" 
          color="#ffffff" 
          font-size="16px" 
          font-weight="600"
          border-radius="8px"
          padding="16px 32px"
          href="{{confirmationUrl}}"
          align="center">
          Confirmer mon adresse email
        </mj-button>
        <mj-text font-size="14px" color="#6b7280" padding-top="30px" padding-bottom="10px">
          Ou copie-colle ce lien dans ton navigateur :
        </mj-text>
        <mj-text font-size="12px" color="#9ca3af" padding-bottom="30px">
          {{confirmationUrl}}
        </mj-text>
        <mj-divider border-color="#e5e7eb" border-width="1px" padding="20px 0" />
        <mj-text font-size="12px" color="#6b7280" align="center">
          Si tu n'es pas à l'origine de cette inscription, tu peux ignorer cet email.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`

export const passwordResetTemplate = `<mjml>
  <mj-head>
    <mj-title>Réinitialisation de ton mot de passe Yams Online</mj-title>
  </mj-head>
  <mj-body background-color="#f3f4f6">
    <mj-section background-color="#ffffff" padding="40px 20px">
      <mj-column>
        <mj-text align="center" font-size="32px" font-weight="bold" color="#1f2937" padding-bottom="20px">
          🔑 Réinitialisation de mot de passe
        </mj-text>
        <mj-text font-size="16px" color="#374151" line-height="1.6" padding-bottom="20px">
          Tu as demandé à réinitialiser ton mot de passe. Clique sur le bouton ci-dessous pour en choisir un nouveau.
        </mj-text>
        <mj-button 
          background-color="#4f46e5" 
          color="#ffffff" 
          font-size="16px" 
          font-weight="600"
          border-radius="8px"
          padding="16px 32px"
          href="{{resetUrl}}"
          align="center">
          Définir un nouveau mot de passe
        </mj-button>
        <mj-text font-size="14px" color="#6b7280" padding-top="30px" padding-bottom="10px">
          Ou copie-colle ce lien dans ton navigateur :
        </mj-text>
        <mj-text font-size="12px" color="#9ca3af" padding-bottom="30px">
          {{resetUrl}}
        </mj-text>
        <mj-divider border-color="#e5e7eb" border-width="1px" padding="20px 0" />
        <mj-text font-size="12px" color="#6b7280" align="center">
          Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email. Ton mot de passe ne sera pas modifié.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`

