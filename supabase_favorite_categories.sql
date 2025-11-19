-- Add is_favorite column to categories table for favoriting income/expense categories
-- This allows users to favorite frequently used categories (like Salary, Rent) 
-- so they appear first in the quick category cards

-- Add is_favorite column to categories table
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering of favorite categories
CREATE INDEX IF NOT EXISTS idx_categories_favorite 
ON categories(user_id, type, is_favorite);

-- Comment for documentation
COMMENT ON COLUMN categories.is_favorite IS 'Indicates if this category is marked as favorite by the user for quick access';
