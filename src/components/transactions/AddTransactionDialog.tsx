import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@supabase/auth-helpers-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { showSuccess, showError } from "@/utils/toast";

const formSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be a positive number in NPR." }),
  description: z.string().optional(),
  date: z.date(),
  categoryId: z.string({ required_error: "Please select or create a category." }),
  is_recurring: z.boolean().default(false),
});

type TransactionType = "income" | "expense";

interface AddTransactionDialogProps {
  type: TransactionType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultCategoryId?: string | null;
}

interface Category { id: string; name: string; }

export function AddTransactionDialog({ type, open, onOpenChange, onSuccess, defaultCategoryId }: AddTransactionDialogProps) {
  const user = useUser();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      description: "",
      categoryId: defaultCategoryId || "",
      is_recurring: false,
    },
  });

  useEffect(() => {
    if (open && user) {
      const fetchPrerequisites = async () => {
        try {
          const { data: categoriesData, error: catError } = await supabase
            .from("categories")
            .select("id, name")
            .eq("user_id", user.id)
            .eq("type", type);
          if (catError) throw catError;
          setCategories(categoriesData || []);

          // Prefill if default provided
          if (defaultCategoryId && categoriesData) {
            const matchingCategory = categoriesData.find(cat => cat.id === defaultCategoryId);
            if (matchingCategory) {
              form.setValue("categoryId", defaultCategoryId);
            }
          }
        } catch (error) {
          console.error('Error fetching categories:', error);
          showError('Failed to load categories. Please try again.');
        }
      };
      fetchPrerequisites();
    }
  }, [open, user, type, defaultCategoryId, form]);

  const handleCreateCategory = async (categoryName: string) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({ name: categoryName, user_id: user.id, type })
        .select("id, name")
        .single();
      if (error) {
        showError(`Failed to create ${type} category.`);
        return null;
      }
      showSuccess(`Custom ${type} category "${categoryName}" created.`);
      setCategories((prev) => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      showError('Failed to create category.');
      return null;
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    setLoading(true);

    try {
      const payload = {
        user_id: user.id,
        amount: values.amount,
        description: values.description,
        category_id: values.categoryId,
        is_recurring: values.is_recurring,
        [type === 'income' ? 'income_date' : 'expense_date']: format(values.date, 'yyyy-MM-dd'),
      };

      const { error } = await supabase.from(type === 'income' ? 'incomes' : 'expenses').insert(payload);

      if (error) {
        showError(`Failed to add ${type}.`);
      } else {
        showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} of NPR ${values.amount} added successfully.`);
        onSuccess();
        form.reset({ date: new Date(), description: "", categoryId: defaultCategoryId || "", is_recurring: false });
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      showError('Failed to add transaction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New {type === 'income' ? 'Income' : 'Expense'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (NPR)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 50000.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monthly salary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{type === 'income' ? 'Income Source' : 'Category'}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? categories.find((cat) => cat.id === field.value)?.name
                            : type === 'income' ? "Select income source" : "Select category"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder={`Search or create ${type} category...`} />
                        <CommandList>
                          <CommandEmpty>
                            <Button
                              variant="ghost"
                              className="w-full justify-left"
                              onClick={async () => {
                                const inputValue = form.getValues('categoryId');
                                if (inputValue) {
                                  const newCategory = await handleCreateCategory(inputValue);
                                  if (newCategory) {
                                    form.setValue("categoryId", newCategory.id);
                                  }
                                }
                              }}
                            >
                              Create "{form.getValues('categoryId')}" ({type})
                            </Button>
                          </CommandEmpty>
                          <CommandGroup>
                            {categories.map((cat) => (
                              <CommandItem
                                value={cat.name}
                                key={cat.id}
                                onSelect={() => {
                                  form.setValue("categoryId", cat.id);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    cat.id === field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {cat.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_recurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Recurring {type === 'income' ? 'Income' : 'Expense'}
                    </FormLabel>
                    <FormDescription>
                      Mark this as a recurring transaction (e.g., monthly salary, rent)
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : `Save ${type === 'income' ? 'Income' : 'Expense'} (NPR)`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}