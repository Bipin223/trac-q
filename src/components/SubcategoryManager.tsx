import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { Plus, Trash2, Star, Edit2, Check, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Subcategory {
  id: string;
  name: string;
  is_favorite: boolean;
  parent_category_id: string;
}

interface SubcategoryManagerProps {
  categoryId: string;
  categoryName: string;
  categoryType: 'income' | 'expense';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubcategoryChange?: () => void;
}

export function SubcategoryManager({
  categoryId,
  categoryName,
  categoryType,
  open,
  onOpenChange,
  onSubcategoryChange,
}: SubcategoryManagerProps) {
  const { profile } = useProfile();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const fetchSubcategories = useCallback(async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('user_id', profile.id)
        .eq('parent_category_id', categoryId)
        .order('name', { ascending: true });

      if (error) throw error;

      // Sort favorites first
      const sorted = (data || []).sort((a, b) => {
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        return a.name.localeCompare(b.name);
      });

      setSubcategories(sorted);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      showError('Failed to load subcategories');
    }
  }, [profile, categoryId]);

  useEffect(() => {
    if (open && profile) {
      fetchSubcategories();
    }
  }, [open, profile, fetchSubcategories]);

  const handleCreate = async () => {
    if (!profile || !newSubcategoryName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('subcategories')
        .insert({
          user_id: profile.id,
          parent_category_id: categoryId,
          name: newSubcategoryName.trim(),
          is_favorite: false,
        });

      if (error) throw error;

      showSuccess(`"${newSubcategoryName}" added to ${categoryName}`);
      setNewSubcategoryName('');
      fetchSubcategories();
      onSubcategoryChange?.();
    } catch (error) {
      const err = error as { code?: string };
      if (err.code === '23505') {
        showError('This subcategory already exists');
      } else {
        showError('Failed to create subcategory');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, newName: string) => {
    if (!profile || !newName.trim()) return;

    try {
      const { error } = await supabase
        .from('subcategories')
        .update({ name: newName.trim() })
        .eq('id', id)
        .eq('user_id', profile.id);

      if (error) throw error;

      showSuccess('Subcategory updated');
      setEditingId(null);
      setEditingName('');
      fetchSubcategories();
      onSubcategoryChange?.();
    } catch (error) {
      const err = error as { code?: string };
      if (err.code === '23505') {
        showError('This subcategory name already exists');
      } else {
        showError('Failed to update subcategory');
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!profile) return;

    try {
      // Check if subcategory is in use
      const tableName = categoryType === 'income' ? 'incomes' : 'expenses';
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('id', { count: 'exact' })
        .eq('user_id', profile.id)
        .eq('subcategory_id', id);

      if (countError) throw countError;

      if (count && count > 0) {
        showError(
          `Cannot delete "${name}". There are ${count} ${categoryType}(s) using it. Please reassign them first.`
        );
        return;
      }

      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id)
        .eq('user_id', profile.id);

      if (error) throw error;

      showSuccess(`"${name}" deleted`);
      fetchSubcategories();
      onSubcategoryChange?.();
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      showError('Failed to delete subcategory');
    }
  };

  const toggleFavorite = async (id: string, currentStatus: boolean) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('subcategories')
        .update({ is_favorite: !currentStatus })
        .eq('id', id)
        .eq('user_id', profile.id);

      if (error) throw error;

      showSuccess(currentStatus ? 'Removed from favorites' : 'Added to favorites');
      fetchSubcategories();
      onSubcategoryChange?.();
    } catch (error) {
      showError('Failed to update favorite status');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Subcategories from {categoryName}</DialogTitle>
          <DialogDescription>
            Create custom subcategories to better organize your {categoryType}s.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Subcategory */}
          <div className="flex gap-2">
            <Input
              placeholder={`Enter subcategory name...`}
              value={newSubcategoryName}
              onChange={(e) => setNewSubcategoryName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreate();
                }
              }}
            />
            <Button onClick={handleCreate} disabled={loading || !newSubcategoryName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Subcategories List */}
          {subcategories.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                {subcategories.length} subcategor{subcategories.length === 1 ? 'y' : 'ies'}
              </Label>
              <div className="grid gap-2">
                {subcategories.map((sub) => (
                  <Card key={sub.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        {editingId === sub.id ? (
                          <>
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="flex-1"
                              autoFocus
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdate(sub.id, editingName);
                                }
                                if (e.key === 'Escape') {
                                  setEditingId(null);
                                  setEditingName('');
                                }
                              }}
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdate(sub.id, editingName)}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingName('');
                                }}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 flex-1">
                              <span className="font-medium">{sub.name}</span>
                              {sub.is_favorite && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="h-3 w-3 mr-1 fill-amber-400 text-amber-400" />
                                  Favorite
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleFavorite(sub.id, sub.is_favorite)}
                                title={sub.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                              >
                                <Star
                                  className={`h-4 w-4 ${
                                    sub.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-gray-400'
                                  }`}
                                />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(sub.id);
                                  setEditingName(sub.name);
                                }}
                              >
                                <Edit2 className="h-4 w-4 text-blue-600" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete "{sub.name}"?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. Make sure no {categoryType}s are using this
                                      subcategory.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(sub.id, sub.name)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No subcategories yet.</p>
              <p className="text-sm">Create your first one above to get started!</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
