import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Stack,
} from "@mui/material";
import { useState, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { useOnExit } from "../../hooks/helper.hooks";
import { produceAppState, useAppStore } from "../../store";
import { supabase } from "../../supabase";
import { refreshMember } from "../../actions/member.actions";

declare global {
  interface Window {
    Paddle?: {
      Environment: {
        set: (env: string) => void;
      };
      Initialize: (options: {
        token: string;
        eventCallback?: (event: PaddleEvent) => void;
      }) => void;
      Checkout: {
        open: (options: {
          items: Array<{ priceId: string; quantity: number }>;
          customer?: { email: string };
          customData?: Record<string, string>;
        }) => void;
      };
    };
  }
}

interface PaddleEvent {
  name: string;
  data?: {
    transaction_id?: string;
  };
}

type Plan = "monthly" | "yearly";

export const PaymentDialog = () => {
  const open = useAppStore((state) => state.payment.open);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paddleLoaded, setPaddleLoaded] = useState(false);

  useEffect(() => {
    if (window.Paddle) {
      setPaddleLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => {
      if (window.Paddle) {
        if (import.meta.env.DEV) {
          window.Paddle.Environment.set("sandbox");
        }

        window.Paddle.Initialize({
          token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN ?? "",
          eventCallback: async (event) => {
            if (
              event.name === "checkout.completed" &&
              event.data?.transaction_id
            ) {
              try {
                const { error: verifyError } = await supabase.functions.invoke(
                  "paddle-verify",
                  {
                    body: { transactionId: event.data.transaction_id },
                  },
                );

                if (verifyError) {
                  setError(
                    "Payment verification failed. Please contact support.",
                  );
                  return;
                }

                setSuccess(true);
                await refreshMember();
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Payment verification failed.",
                );
              }
            }
          },
        });

        setPaddleLoaded(true);
      }
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const handleClose = () => {
    produceAppState((draft) => {
      draft.payment.open = false;
    });
    setSelectedPlan("monthly");
    setLoading(false);
    setError(null);
    setSuccess(false);
  };

  useOnExit(() => {
    handleClose();
  });

  const handlePayment = async () => {
    if (!paddleLoaded || !window.Paddle) {
      setError("Loading payment system. Please try again shortly.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email || !user?.id) {
        setError("Unable to verify login. Please sign in again.");
        return;
      }

      const priceId =
        selectedPlan === "monthly"
          ? import.meta.env.VITE_PADDLE_PRICE_MONTHLY
          : import.meta.env.VITE_PADDLE_PRICE_YEARLY;

      if (!priceId) {
        setError("Payment is not configured. Please contact support.");
        return;
      }

      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email: user.email },
        customData: { userId: user.id },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogContent>
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              <FormattedMessage defaultMessage="Payment completed!" />
            </Typography>
            <Button variant="contained" onClick={handleClose} fullWidth>
              <FormattedMessage defaultMessage="Continue" />
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography
            variant="h5"
            sx={{ mb: 3, textAlign: "center", fontWeight: 600 }}
          >
            <FormattedMessage defaultMessage="Vocally Pro" />
          </Typography>

          <Stack spacing={2} sx={{ mb: 3 }}>
            <Box
              onClick={() => setSelectedPlan("monthly")}
              sx={{
                p: 2.5,
                border: 2,
                borderColor:
                  selectedPlan === "monthly" ? "primary.main" : "grey.300",
                borderRadius: 2,
                cursor: "pointer",
                transition: "all 0.2s",
                bgcolor:
                  selectedPlan === "monthly" ? "primary.50" : "transparent",
                "&:hover": {
                  borderColor:
                    selectedPlan === "monthly" ? "primary.main" : "grey.400",
                },
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    <FormattedMessage defaultMessage="Monthly" />
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <FormattedMessage defaultMessage="Billed monthly" />
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  $5/mo
                </Typography>
              </Stack>
            </Box>

            <Box
              onClick={() => setSelectedPlan("yearly")}
              sx={{
                p: 2.5,
                border: 2,
                borderColor:
                  selectedPlan === "yearly" ? "primary.main" : "grey.300",
                borderRadius: 2,
                cursor: "pointer",
                position: "relative",
                transition: "all 0.2s",
                bgcolor:
                  selectedPlan === "yearly" ? "primary.50" : "transparent",
                "&:hover": {
                  borderColor:
                    selectedPlan === "yearly" ? "primary.main" : "grey.400",
                },
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: -10,
                  right: 16,
                  bgcolor: "error.main",
                  color: "white",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                <FormattedMessage defaultMessage="Save 17%" />
              </Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    <FormattedMessage defaultMessage="Yearly" />
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <FormattedMessage defaultMessage="Billed annually" />
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  $50/yr
                </Typography>
              </Stack>
            </Box>
          </Stack>

          {error && (
            <Typography
              variant="body2"
              color="error"
              sx={{ mb: 2, textAlign: "center" }}
            >
              {error}
            </Typography>
          )}

          <Button
            variant="contained"
            onClick={handlePayment}
            disabled={loading || !paddleLoaded}
            fullWidth
            size="large"
            sx={{ height: 48 }}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              <FormattedMessage defaultMessage="Subscribe" />
            )}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
