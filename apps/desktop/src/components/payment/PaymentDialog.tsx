import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Stack,
} from "@mui/material";
import { useState, useEffect, useRef } from "react";
import { FormattedMessage } from "react-intl";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useOnExit } from "../../hooks/helper.hooks";
import { getAppState, produceAppState, useAppStore } from "../../store";
import { supabase } from "../../supabase";
import { refreshMember } from "../../actions/member.actions";

const POLAR_PRODUCT_MONTHLY = "25bf6350-bebc-4b9f-b896-66767ce9304a";
const POLAR_PRODUCT_YEARLY = "d73b4531-65c2-4eb8-976d-b6fcc1ae99e5";
const POLL_INTERVAL_MS = 5000;
const POLL_MAX_DURATION_MS = 5 * 60 * 1000;

type Plan = "monthly" | "yearly";
type DialogState = "idle" | "creating" | "waiting" | "success" | "error";

export const PaymentDialog = () => {
  const isOpen = useAppStore((state) => state.payment.open);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("monthly");
  const [dialogState, setDialogState] = useState<DialogState>("idle");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const checkPaymentStatus = async () => {
    await refreshMember();
    const state = getAppState();
    const userId = state.auth?.id;
    if (!userId) return;
    const member = state.memberById[userId];
    if (member?.plan === "pro") {
      stopPolling();
      setDialogState("success");
    }
  };

  const startPolling = () => {
    stopPolling();
    pollStartRef.current = Date.now();
    pollRef.current = setInterval(async () => {
      if (Date.now() - pollStartRef.current > POLL_MAX_DURATION_MS) {
        stopPolling();
        return;
      }
      await checkPaymentStatus();
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const handleClose = () => {
    stopPolling();
    produceAppState((draft) => {
      draft.payment.open = false;
    });
    setSelectedPlan("monthly");
    setDialogState("idle");
    setError(null);
  };

  useOnExit(() => {
    handleClose();
  });

  const handlePayment = async () => {
    setDialogState("creating");
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email || !user?.id) {
        setError("Unable to verify login. Please sign in again.");
        setDialogState("error");
        return;
      }

      const productId =
        selectedPlan === "monthly"
          ? POLAR_PRODUCT_MONTHLY
          : POLAR_PRODUCT_YEARLY;

      const { data, error: invokeError } = await supabase.functions.invoke(
        "polar-checkout",
        { body: { productId } },
      );

      if (invokeError || !data?.checkoutUrl) {
        setError("Failed to create checkout. Please try again.");
        setDialogState("error");
        return;
      }

      await openUrl(data.checkoutUrl);
      setDialogState("waiting");
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
      setDialogState("error");
    }
  };

  if (dialogState === "success") {
    return (
      <Dialog open={isOpen} onClose={handleClose} fullWidth maxWidth="sm">
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

  if (dialogState === "waiting") {
    return (
      <Dialog open={isOpen} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogContent>
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              <FormattedMessage defaultMessage="Complete your payment" />
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              <FormattedMessage defaultMessage="Finish the checkout in your browser. We'll detect when it's done." />
            </Typography>
            <Button
              variant="contained"
              onClick={checkPaymentStatus}
              fullWidth
              size="large"
              sx={{ height: 48 }}
            >
              <FormattedMessage defaultMessage="Check Payment Status" />
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} fullWidth maxWidth="sm">
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
            disabled={dialogState === "creating"}
            fullWidth
            size="large"
            sx={{ height: 48 }}
          >
            {dialogState === "creating" ? (
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
