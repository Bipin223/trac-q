import { toast } from "sonner";

// Default toast duration in milliseconds (4 seconds)
const DEFAULT_TOAST_DURATION = 4000;

export const showSuccess = (message: string, duration: number = DEFAULT_TOAST_DURATION) => {
  toast.success(message, {
    duration,
    position: 'top-right',
  });
};

export const showError = (message: string, duration: number = DEFAULT_TOAST_DURATION) => {
  toast.error(message, {
    duration,
    position: 'top-right',
  });
};

export const showLoading = (message: string) => {
  return toast.loading(message, {
    position: 'top-right',
  });
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

// New helper for custom toast with duration
export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = DEFAULT_TOAST_DURATION) => {
  toast[type](message, {
    duration,
    position: 'top-right',
  });
};
