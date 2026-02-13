UPDATE user_preferences
SET dictation_pill_visibility = 'persistent'
WHERE dictation_pill_visibility IS NULL
   OR dictation_pill_visibility = ''
   OR dictation_pill_visibility = 'while_active';
