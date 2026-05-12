import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Gastpas Invite Endpoint
 * Genereert/update gastpas credentials en verstuurt uitnodigingsmail naar baasje
 */

Deno.serve(async (req) => {
  console.log('=== sendGastpasInvite START ===');
  
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('Step 1: Authenticating user...');
    const user = await base44.auth.me();
    
    if (!user) {
      console.error('ERROR: No user authenticated');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✓ User authenticated:', user.email);

    // Parse request body
    console.log('Step 2: Parsing request body...');
    const body = await req.json();
    const { dogId, recipientEmail, gastpasPassword, personalMessage } = body;
    console.log('✓ Request body parsed:', { dogId, recipientEmail, hasPassword: !!gastpasPassword, hasMessage: !!personalMessage });

    if (!dogId || !recipientEmail || !gastpasPassword) {
      console.error('ERROR: Missing required parameters');
      return Response.json({ 
        error: 'Missing required parameters: dogId, recipientEmail, gastpasPassword' 
      }, { status: 400 });
    }

    // Fetch dog with service role - using filter for direct lookup
    console.log('Step 3: Fetching dog from database...');
    const dogs = await base44.asServiceRole.entities.Dog.filter({ id: dogId });
    console.log('✓ Fetched', dogs.length, 'dogs from database');
    
    const dog = dogs[0];

    if (!dog) {
      console.error('ERROR: Dog not found with ID:', dogId);
      return Response.json({ error: 'Dog not found' }, { status: 404 });
    }
    console.log('✓ Found dog:', dog.naam);

    // Generate gastpas_slug if not exists
    let gastpasSlug = dog.gastpas_slug;
    if (!gastpasSlug) {
      gastpasSlug = crypto.randomUUID();
      console.log('✓ Generated new gastpas_slug:', gastpasSlug);
    } else {
      console.log('✓ Using existing gastpas_slug:', gastpasSlug);
    }

    // Update dog with gastpas credentials
    console.log('Step 4: Updating dog with credentials...');
    try {
      await base44.asServiceRole.entities.Dog.update(dogId, {
        gastpas_slug: gastpasSlug,
        gastpas_wachtwoord: gastpasPassword
      });
      console.log('✓ Dog updated successfully');
    } catch (updateError) {
      console.error('ERROR: Failed to update dog profile:', updateError);
      console.error('Update error details:', { message: updateError.message, stack: updateError.stack });
      return Response.json({ 
        error: 'Failed to update dog profile',
        details: updateError.message 
      }, { status: 500 });
    }

    // CRITICAL FIX: Construct gastpas URL with correct domain
    // Use custom domain instead of Deno Deploy URL
    let gastpasUrl;
    const customDomain = Deno.env.get('CUSTOM_DOMAIN') || 'advies.kwiekenkwispel.be';
    
    // Check if request came from custom domain
    const requestOrigin = new URL(req.url).origin;
    if (requestOrigin.includes('kwiekenkwispel.be')) {
      gastpasUrl = `${requestOrigin}/gastpas/${gastpasSlug}`;
    } else {
      // Fallback to configured custom domain
      gastpasUrl = `https://${customDomain}/gastpas/${gastpasSlug}`;
    }
    
    console.log('✓ Gastpas URL:', gastpasUrl);
    console.log('  Request origin:', requestOrigin);

    // Construct email body
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #1D3C87 0%, #F7C9D2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #f9f9f9;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .credentials {
      background: white;
      border: 2px solid #F7C9D2;
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
    }
    .credentials p {
      margin: 10px 0;
    }
    .credentials strong {
      color: #1D3C87;
    }
    .button {
      display: inline-block;
      background: #1D3C87;
      color: white;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 25px;
      font-weight: bold;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🐾 Kwiek & Kwispel</h1>
    <p>Jouw hondenprofiel is klaar!</p>
  </div>

  <div class="content">
    <h2>Beste ${dog.baasje_naam || 'baasje'},</h2>
    
    <p>Je kunt nu het online profiel van <strong>${dog.naam}</strong> bekijken!</p>
    
    ${personalMessage ? `<p><em>${personalMessage}</em></p>` : ''}
    
    <p>Via deze beveiligde link kun je altijd het actuele voedingsadvies, gewichtsevolutie, sessiegeschiedenis en doelstellingen van ${dog.naam} raadplegen.</p>

    <div class="credentials">
      <p><strong>Link naar het profiel:</strong></p>
      <p><a href="${gastpasUrl}" style="color: #1D3C87; word-break: break-all;">${gastpasUrl}</a></p>
      <br>
      <p><strong>Jouw wachtwoord:</strong></p>
      <p style="font-size: 18px; font-weight: bold; color: #1D3C87;">${gastpasPassword}</p>
    </div>

    <p><strong>Hoe werkt het?</strong></p>
    <ol>
      <li>Klik op de link hierboven</li>
      <li>Voer het wachtwoord in</li>
      <li>Bekijk het profiel van ${dog.naam}</li>
    </ol>

    <p style="text-align: center;">
      <a href="${gastpasUrl}" class="button">Bekijk Profiel</a>
    </p>

    <p style="color: #666; font-size: 14px;">
      <strong>Let op:</strong> Bewaar dit wachtwoord goed. Je hebt het nodig om toegang te krijgen tot het profiel.
    </p>
  </div>

  <div class="footer">
    <p><strong>Kwiek & Kwispel</strong></p>
    <p>Voor vragen kun je altijd contact opnemen met je voedingsadviseur.</p>
  </div>
</body>
</html>
    `.trim();

    // Send email
    console.log('Step 5: Sending email...');
    console.log('Email recipient:', recipientEmail);
    console.log('Email subject:', `Jouw Kwiek & Kwispel profiel voor ${dog.naam}`);
    
    try {
      const emailResult = await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: "Kwiek & Kwispel",
        to: recipientEmail,
        subject: `Jouw Kwiek & Kwispel profiel voor ${dog.naam}`,
        body: emailBody
      });
      console.log('✓ Email sent successfully:', emailResult);
    } catch (emailError) {
      console.error('ERROR sending email:', emailError);
      console.error('Email error details:', { message: emailError.message, stack: emailError.stack, name: emailError.name });
      
      // Return ERROR (not success) when email fails
      return Response.json({
        error: 'Email kon niet worden verzonden',
        details: emailError.message,
        gastpas_slug: gastpasSlug,
        gastpas_url: gastpasUrl
      }, { status: 500 });
    }

    console.log('=== sendGastpasInvite SUCCESS ===');
    return Response.json({
      success: true,
      gastpas_slug: gastpasSlug,
      gastpas_url: gastpasUrl,
      message: 'Uitnodiging succesvol verstuurd'
    });

  } catch (error) {
    console.error('=== sendGastpasInvite FATAL ERROR ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return Response.json({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});