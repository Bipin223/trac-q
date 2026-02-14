import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

export interface Account {
    id: string;
    user_id: string;
    balance: number;
    currency: string;
    created_at: string;
    updated_at: string;
}

export interface Transaction {
    id: string;
    user_id: string;
    account_id: string;
    transaction_type: 'debit' | 'credit';
    amount: number;
    balance_after: number;
    description: string | null;
    category: 'money_request' | 'lend' | 'borrow' | 'deposit' | 'withdrawal' | 'transfer';
    reference_id: string | null;
    reference_type: string | null;
    created_at: string;
}

/**
 * Get user's account details
 */
export async function getUserAccount(userId: string): Promise<Account | null> {
    try {
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error('Error fetching account:', error);
        return null;
    }
}

/**
 * Get user's transaction history
 */
export async function getTransactionHistory(
    userId: string,
    limit: number = 50
): Promise<Transaction[]> {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error: any) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

/**
 * Add funds to user account (for testing purposes)
 */
export async function addFunds(userId: string, amount: number, description: string = 'Deposit'): Promise<boolean> {
    try {
        // Get current account
        const account = await getUserAccount(userId);
        if (!account) {
            showError('Account not found');
            return false;
        }

        // Update balance
        const newBalance = account.balance + amount;
        const { error: updateError } = await supabase
            .from('accounts')
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq('user_id', userId);

        if (updateError) throw updateError;

        // Create transaction record
        const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                account_id: account.id,
                transaction_type: 'credit',
                amount: amount,
                balance_after: newBalance,
                description: description,
                category: 'deposit',
            });

        if (transactionError) throw transactionError;

        showSuccess(`Added NPR ${amount.toLocaleString()} to your account`);
        return true;
    } catch (error: any) {
        console.error('Error adding funds:', error);
        showError('Failed to add funds');
        return false;
    }
}

/**
 * Withdraw funds from user account (for testing purposes)
 */
export async function withdrawFunds(userId: string, amount: number, description: string = 'Withdrawal'): Promise<boolean> {
    try {
        // Get current account
        const account = await getUserAccount(userId);
        if (!account) {
            showError('Account not found');
            return false;
        }

        // Check sufficient balance
        if (account.balance < amount) {
            showError('Insufficient balance');
            return false;
        }

        // Update balance
        const newBalance = account.balance - amount;
        const { error: updateError } = await supabase
            .from('accounts')
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq('user_id', userId);

        if (updateError) throw updateError;

        // Create transaction record
        const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                account_id: account.id,
                transaction_type: 'debit',
                amount: amount,
                balance_after: newBalance,
                description: description,
                category: 'withdrawal',
            });

        if (transactionError) throw transactionError;

        showSuccess(`Withdrawn NPR ${amount.toLocaleString()} from your account`);
        return true;
    } catch (error: any) {
        console.error('Error withdrawing funds:', error);
        showError('Failed to withdraw funds');
        return false;
    }
}

/**
 * Process money request payment
 */
export async function processMoneyRequestPayment(
    moneyRequestId: string,
    payerId: string,
    receiverId: string,
    amount: number
): Promise<boolean> {
    try {
        // Call the database function to process payment
        const { data, error } = await supabase.rpc('process_money_request_payment', {
            p_money_request_id: moneyRequestId,
            p_payer_id: payerId,
            p_receiver_id: receiverId,
            p_amount: amount,
        });

        if (error) {
            if (error.message.includes('Insufficient balance')) {
                showError('Insufficient balance to complete payment');
            } else {
                throw error;
            }
            return false;
        }

        if (data && data.success) {
            showSuccess('Payment completed successfully!');
            return true;
        }

        return false;
    } catch (error: any) {
        console.error('Error processing payment:', error);
        showError('Failed to process payment');
        return false;
    }
}

/**
 * Get account balance summary
 */
export async function getAccountSummary(userId: string) {
    try {
        const account = await getUserAccount(userId);
        if (!account) return null;

        // Get recent transactions
        const transactions = await getTransactionHistory(userId, 10);

        // Calculate totals
        const totalCredits = transactions
            .filter(t => t.transaction_type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalDebits = transactions
            .filter(t => t.transaction_type === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            account,
            recentTransactions: transactions,
            totalCredits,
            totalDebits,
        };
    } catch (error: any) {
        console.error('Error fetching account summary:', error);
        return null;
    }
}
