import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iqzkmkgysztzkdwqpivj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxemtta2d5c3p0emtkd3FwaXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5OTAyNDYsImV4cCI6MjA5MDU2NjI0Nn0.rotTWISKLuo6V92DDldvIMFkIV969y2NdvrCoJEtzh8'

export const supabase = createClient(supabaseUrl, supabaseKey)