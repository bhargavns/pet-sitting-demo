// jobQueries.js
const db = require("../config/database");

const getOpenJobs = async () => {
  const jobs = await db.any(`
    SELECT 
      jp.id,
      jp.title,
      jp.description,
      TO_CHAR(jp.date_start, 'MM/DD/YYYY') AS date_start,
      TO_CHAR(jp.date_end, 'MM/DD/YYYY') AS date_end,
      jp.status,
      jp.hourly_rate,
      e.name AS employer_name,
      e.location,
      p.name AS pet_name,
      p.pet_type
    FROM 
        JOB_POST jp
    JOIN 
        EMPLOYER emp ON jp.employer_id = emp.id
    JOIN 
        APP_USER e ON emp.user_id = e.id
    JOIN 
        PET p ON jp.pet_id = p.id
    WHERE 
        jp.status = 'open'
    ORDER BY 
        jp.created_at DESC
  `);
  return jobs;
};

module.exports = { getOpenJobs };