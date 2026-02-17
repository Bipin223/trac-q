import { useState, useEffect } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { getUserAccount, processMoneyRequestPayment, type Account } from '@/lib/paymentService';

interface PaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    moneyRequestId: string;
    amount: number;
    receiverId: string;
    receiverName: string;
    description: string;
    onSuccess?: () => void;
}

export function PaymentDialog({
    open,
    onOpenChange,
    moneyRequestId,
    amount,
    receiverId,
    receiverName,
    description,
    onSuccess,
}: PaymentDialogProps) {
    const { profile } = useProfile();
    const [account, setAccount] = useState<Account | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open && profile) {
            fetchAccount();
        }
    }, [open, profile]);

    const fetchAccount = async () => {
        if (!profile) return;
        setLoading(true);
        const accountData = await getUserAccount(profile.id);
        setAccount(accountData);
        setLoading(false);
    };

    const handlePayment = async () => {
        if (!profile || !account) return;

        setProcessing(true);
        const success = await processMoneyRequestPayment(
            moneyRequestId,
            profile.id,
            receiverId,
            amount
        );

        if (success) {
            onOpenChange(false);
            onSuccess?.();
        }
        setProcessing(false);
    };

    const hasSufficientBalance = account ? account.balance >= amount : false;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Confirm Payment
                    </DialogTitle>
                    <DialogDescription>
                        Review payment details before confirming
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        {/* Payment Details */}
                        <div className="space-y-3 rounded-lg border p-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Paying to:</span>
                                <span className="font-semibold">{receiverName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Amount:</span>
                                <span className="text-2xl font-bold text-primary">
                                    रु  {amount.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="text-sm text-muted-foreground">Description:</span>
                                <span className="text-sm text-right max-w-[200px]">{description}</span>
                            </div>
                        </div>

                        {/* Account Balance */}
                        <div className="space-y-2 rounded-lg border p-4 bg-muted/50">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Current Balance:</span>
                                <span className="font-semibold">
                                    रु  {account?.balance.toLocaleString() || '0'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">After Payment:</span>
                                <span className={`font-semibold ${hasSufficientBalance ? 'text-green-600' : 'text-red-600'}`}>
                                    रु  {((account?.balance || 0) - amount).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Warnings/Confirmations */}
                        {!hasSufficientBalance ? (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Insufficient balance. Please add funds to your account first.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription>
                                    This payment will be recorded in your transaction history and create a lend record.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                        className="w-full sm:w-auto"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePayment}
                        disabled={!hasSufficientBalance || processing || loading}
                        className="w-full sm:w-auto"
                    >
                        {processing ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            `Pay रु  ${amount.toLocaleString()}`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
