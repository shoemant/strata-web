const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://igykogntboasdbmpzeca.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlneWtvZ250Ym9hc2RibXB6ZWNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODI5OTYwMywiZXhwIjoyMDYzODc1NjAzfQ.L7ngwNsFIMkgQ8sguEr_1Nr5ImLvOQkPAWc4MhaKclw'
);

async function checkUserExists(email) {
    const { data, error } = await supabase.auth.admin.listUsers({ email });

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    if (data?.users?.length > 0) {
        console.log(`User with email "${email}" exists.`);
    } else {
        console.log(`No user found with email "${email}".`);
    }
}

// Replace with the email you want to check
checkUserExists('sumantdhir2@gmail.com');


