// send-installation-report Deno Function
// Envoie un email de compte-rendu d'installation via l'API Brevo

Deno.serve(async (req) => {
  console.log(JSON.stringify({ 
    stage: "start", 
    url: req.url, 
    method: req.method 
  }));

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { 
      clientEmail, 
      clientName, 
      numeroIntervention, 
      dateIntervention, 
      pdfBase64,
      pdfFilename 
    } = body;

    console.log(JSON.stringify({
      stage: "config",
      params: {
        hasClientEmail: Boolean(clientEmail),
        hasClientName: Boolean(clientName),
        hasNumeroIntervention: Boolean(numeroIntervention),
        hasDateIntervention: Boolean(dateIntervention),
        hasPdfBase64: Boolean(pdfBase64),
        hasPdfFilename: Boolean(pdfFilename)
      }
    }));

    // Validation des paramètres
    if (!clientEmail || !clientName || !numeroIntervention || !dateIntervention || !pdfBase64 || !pdfFilename) {
      console.error(JSON.stringify({
        stage: "error",
        type: "ValidationError",
        message: "Missing required parameters"
      }));
      
      return new Response(
        JSON.stringify({ 
          error: "Missing required parameters", 
          required: ["clientEmail", "clientName", "numeroIntervention", "dateIntervention", "pdfBase64", "pdfFilename"] 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Clé API Brevo
    const brevoApiKey = Deno.env.get("BREVO_API_KEY") || "";

    // Template HTML professionnel
    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compte-rendu d'intervention</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f7;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f7;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header bleu -->
          <tr>
            <td style="background-color: #2563eb; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                📋 Compte-rendu d'intervention
              </h1>
              <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 16px;">
                SoplanÉlevage
              </p>
            </td>
          </tr>

          <!-- Message de remerciement -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; line-height: 1.6;">
                Bonjour <strong>${clientName}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Nous vous remercions de votre confiance. Vous trouverez ci-joint le compte-rendu détaillé de l'intervention réalisée sur votre installation.
              </p>
            </td>
          </tr>

          <!-- Détails de l'intervention -->
          <tr>
            <td style="padding: 0 30px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 15px; color: #2563eb; font-size: 18px; font-weight: bold;">
                      Détails de l'intervention
                    </h2>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 160px;">
                          <strong>N° Intervention :</strong>
                        </td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">
                          ${numeroIntervention}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                          <strong>Date :</strong>
                        </td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">
                          ${dateIntervention}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                          <strong>Document :</strong>
                        </td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">
                          ${pdfFilename}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bouton Espace Client -->
          <tr>
            <td style="padding: 0 30px 40px; text-align: center;">
              <a href="https://preview--soplanelevage-maintenance.lumi.ing" 
                 style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                🔐 Accéder à mon espace client
              </a>
              <p style="margin: 15px 0 0; color: #9ca3af; font-size: 13px;">
                Consultez l'historique complet de vos interventions
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                Pour toute question, contactez-nous à <a href="mailto:lqfchampagne@gmail.com" style="color: #2563eb; text-decoration: none;">lqfchampagne@gmail.com</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} SoplanÉlevage - Tous droits réservés
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Payload pour l'API Brevo
    const emailPayload = {
      sender: {
        name: "SoplanÉlevage",
        email: "lqfchampagne@gmail.com"
      },
      to: [
        {
          email: clientEmail,
          name: clientName
        }
      ],
      subject: `📋 Compte-rendu d'intervention N°${numeroIntervention}`,
      htmlContent: htmlContent,
      attachment: [
        {
          content: pdfBase64,
          name: pdfFilename
        }
      ]
    };

    console.log(JSON.stringify({
      stage: "external_request",
      url: "https://api.brevo.com/v3/smtp/email",
      method: "POST",
      recipient: clientEmail,
      subject: emailPayload.subject,
      hasAttachment: true
    }));

    // Appel à l'API Brevo
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(emailPayload)
    });

    const responseData = await brevoResponse.json();

    console.log(JSON.stringify({
      stage: "external_response",
      status: brevoResponse.status,
      payload: responseData
    }));

    if (!brevoResponse.ok) {
      console.error(JSON.stringify({
        stage: "error",
        type: "BrevoAPIError",
        status: brevoResponse.status,
        message: responseData
      }));

      return new Response(
        JSON.stringify({ 
          error: "Failed to send email", 
          details: responseData 
        }),
        { status: brevoResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Succès
    const successResponse = {
      success: true,
      emailId: responseData.messageId,
      recipient: clientEmail
    };

    console.log(JSON.stringify({
      stage: "response",
      success: true,
      emailId: responseData.messageId,
      recipient: clientEmail
    }));

    return new Response(
      JSON.stringify(successResponse),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error(JSON.stringify({
      stage: "error",
      type: error.constructor.name,
      message: error.message,
      stack: error.stack
    }));

    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: error.message 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
