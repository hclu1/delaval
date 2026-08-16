// Deno Function pour envoyer des emails d'invitation via Brevo (ex-Sendinblue)
// 🎯 AVANTAGE: Pas besoin de vérifier de domaine, fonctionne immédiatement !

Deno.serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  try {
    const { recipientEmail, recipientName, userRole, appUrl } = await req.json()

    // Validation des paramètres obligatoires
    if (!recipientEmail || !recipientName || !userRole || !appUrl) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return new Response(
        JSON.stringify({ error: 'Format email invalide' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validation du rôle
    if (!userRole || userRole.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Le rôle utilisateur est requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validation de l'URL
    try {
      new URL(appUrl)
    } catch {
      return new Response(
        JSON.stringify({ error: 'URL invalide' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ═══════════════════════════════════════════════════════════
    // 🔑 CONFIGURATION BREVO
    // ═══════════════════════════════════════════════════════════
    // ⚠️ REMPLACE CETTE CLÉ PAR LA TIENNE
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") || "";
    
    // Si tu préfères utiliser une variable d'environnement (recommandé) :
    // const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    // Construction de l'email HTML professionnel
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .button:hover { background: #1e40af; }
    .steps { background: white; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0; border-radius: 4px; }
    .step { margin: 12px 0; padding-left: 24px; position: relative; }
    .step::before { content: "→"; position: absolute; left: 0; color: #2563eb; font-weight: bold; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding: 20px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0; border-radius: 4px; }
    @media only screen and (max-width: 600px) {
      .container { padding: 10px; }
      .header, .content { padding: 20px; }
      .button { display: block; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🔧 Invitation SoplanÉlevage</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Application de maintenance industrielle</p>
    </div>
    
    <div class="content">
      <h2 style="color: #1f2937; margin-top: 0;">Bonjour ${recipientName},</h2>
      
      <p>Vous avez été invité(e) à rejoindre l'application de maintenance <strong>SoplanÉlevage</strong> en tant que <strong>${userRole}</strong>.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${appUrl}" class="button">🚀 Accéder à l'application</a>
      </div>
      
      <div class="steps">
        <h3 style="margin-top: 0; color: #1f2937;">📝 Instructions de connexion :</h3>
        <div class="step">Cliquez sur le bouton ci-dessus</div>
        <div class="step">Cliquez sur <strong>"Se connecter avec Google"</strong></div>
        <div class="step">Utilisez votre compte Google : <strong>${recipientEmail}</strong></div>
        <div class="step">Vous serez automatiquement connecté à l'application</div>
      </div>
      
      <div class="warning">
        <strong>⚠️ Important :</strong> La connexion se fait uniquement via Google. Utilisez bien l'adresse email <strong>${recipientEmail}</strong> lors de la connexion.
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Si vous avez des questions, contactez votre responsable technique.
      </p>
    </div>
    
    <div class="footer">
      <p>SoplanÉlevage - Application de maintenance industrielle</p>
      <p>© ${new Date().getFullYear()} - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>
    `

    const emailText = `
Bonjour ${recipientName},

Vous avez été invité(e) à rejoindre l'application de maintenance SoplanÉlevage en tant que ${userRole}.

Instructions de connexion :
→ Accédez à : ${appUrl}
→ Cliquez sur "Se connecter avec Google"
→ Utilisez votre compte Google : ${recipientEmail}
→ Vous serez automatiquement connecté

⚠️ Important : La connexion se fait uniquement via Google. Utilisez bien l'adresse email ${recipientEmail}.

Si vous avez des questions, contactez votre responsable technique.

SoplanÉlevage - Application de maintenance industrielle
© ${new Date().getFullYear()} - Tous droits réservés
    `

    // ═══════════════════════════════════════════════════════════
    // 📧 ENVOI VIA BREVO API
    // ═══════════════════════════════════════════════════════════
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'SoplanÉlevage',
          email: 'lqfchampagne@gmail.com' // ✅ Tu peux utiliser ton email Gmail ici
        },
        to: [
          {
            email: recipientEmail,
            name: recipientName
          }
        ],
        subject: `🔧 Invitation SoplanÉlevage - ${userRole}`,
        htmlContent: emailHtml,
        textContent: emailText,
        tags: ['invitation', userRole.toLowerCase().replace(/\s+/g, '_')]
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Erreur Brevo:', data)
      return new Response(
        JSON.stringify({ 
          error: 'Échec envoi email', 
          details: data.message || data.code || 'Erreur inconnue'
        }),
        { 
          status: response.status,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    console.log('✅ Email envoyé avec succès via Brevo')
    console.log('   → Destinataire:', recipientEmail)
    console.log('   → Message ID:', data.messageId)
    console.log('   → Rôle:', userRole)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email d\'invitation envoyé avec succès',
        emailId: data.messageId,
        recipient: recipientEmail,
        role: userRole
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('❌ Erreur fonction:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erreur serveur', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})