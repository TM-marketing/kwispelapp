import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * PUBLIC Gastpas Login Validation
 * Validates slug + password WITHOUT requiring user authentication
 * Returns dogId if valid, error if not
 */

Deno.serve(async (req) => {
  try {
    console.log('=== validateGastpasLogin START ===');
    
    // Create client (no user auth required for this endpoint)
    const base44 = createClientFromRequest(req);
    
    // Parse request
    const { slug, password } = await req.json();
    console.log('Validating login for slug:', slug);
    
    if (!slug || !password) {
      return Response.json({ 
        error: 'Missing slug or password' 
      }, { status: 400 });
    }

    // Fetch all dogs via service role (no auth needed)
    const dogs = await base44.asServiceRole.entities.Dog.list();
    console.log('Fetched', dogs.length, 'dogs');
    
    // Find dog with matching slug
    const dog = dogs.find(d => d.gastpas_slug === slug);
    
    if (!dog) {
      console.log('No dog found with slug:', slug);
      return Response.json({ 
        error: 'Profiel niet gevonden',
        valid: false 
      }, { status: 404 });
    }
    
    console.log('Found dog:', dog.naam);
    
    // Check password
    if (!dog.gastpas_wachtwoord) {
      console.log('No password set for this dog');
      return Response.json({ 
        error: 'Geen wachtwoord ingesteld',
        valid: false 
      }, { status: 403 });
    }
    
    if (dog.gastpas_wachtwoord !== password) {
      console.log('Password mismatch');
      return Response.json({ 
        error: 'Onjuist wachtwoord',
        valid: false 
      }, { status: 401 });
    }
    
    // Success!
    console.log('✓ Login valid for dog:', dog.id);
    return Response.json({
      valid: true,
      dogId: dog.id,
      dogName: dog.naam
    });

  } catch (error) {
    console.error('validateGastpasLogin error:', error);
    return Response.json({ 
      error: 'Server error',
      details: error.message,
      valid: false
    }, { status: 500 });
  }
});