import { supabase } from './src/supabaseClient.ts';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("Testing Firestore adapter deletion...");
  
  const { data: list, error: listError } = await supabase.from('employee_birthdays').select('*');
  if (listError) {
    console.error("List error:", listError);
    return;
  }
  
  console.log(`Found ${list.length} records.`);
  const testRecord = list.find(r => r.employee_name === "Lâm Thị Như Ý");
  
  if (!testRecord) {
    console.log("No record found with name Lâm Thị Như Ý.");
    return;
  }
  
  console.log("Found test record:", testRecord);
  console.log(`Attempting to delete record with ID: ${testRecord.id}...`);
  
  const { error: deleteError } = await supabase
    .from('employee_birthdays')
    .delete()
    .eq('id', testRecord.id);
    
  if (deleteError) {
    console.error("Delete error:", deleteError);
    return;
  }
  
  console.log("Delete call completed. Verifying...");
  
  const { data: verifyList } = await supabase.from('employee_birthdays').select('*');
  const deletedStillExists = verifyList.some(r => r.id === testRecord.id);
  console.log("Is record still in Firestore?", deletedStillExists ? "YES (DELETE FAILED)" : "NO (DELETE SUCCESSFUL)");
}

run().catch(console.error);
