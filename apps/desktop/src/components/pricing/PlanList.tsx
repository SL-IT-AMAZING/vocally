import { CheckRounded } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  type SxProps,
} from "@mui/material";
import { MemberPlan } from "@repo/types";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { loadPrices } from "../../actions/pricing.actions";
import { useOnEnter } from "../../hooks/helper.hooks";
import { useAppStore } from "../../store";
import { getEffectivePlan } from "../../utils/member.utils";
import { getKrwPriceFromKey, PricingPlan } from "../../utils/price.utils";

const ENTERPRISE_INVITE_CODE = "5AX9G";

type CheckmarkRowProps = {
  children?: React.ReactNode;
  disabled?: boolean;
};

const CheckmarkRow = ({ children, disabled }: CheckmarkRowProps) => {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      sx={{ opacity: disabled ? 0.3 : 1 }}
    >
      <CheckRounded sx={{ fontSize: 16 }} />
      <Typography variant="body2">{children}</Typography>
    </Stack>
  );
};

type PlanCardProps = {
  cardSx?: SxProps;
  buttonSx?: SxProps;
  buttonVariant?: "contained" | "outlined" | "text";
  title?: React.ReactNode;
  price?: React.ReactNode;
  children?: React.ReactNode;
  color?: string;
  disabled?: boolean;
  button?: React.ReactNode;
};

const PlanCard = ({
  cardSx,
  title,
  price,
  children,
  color,
  button,
}: PlanCardProps) => {
  return (
    <Card
      sx={{
        width: { xs: "100%", sm: 260 },
        border: "3px solid",
        borderColor: color ?? "transparent",
        backgroundColor: "level0",
        ...cardSx,
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 0.25,
          p: 1.5,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" fontWeight={600}>
          {price}
        </Typography>
        <Box sx={{ mt: 1, mb: 1.5 }}>{button}</Box>
        {children}
      </CardContent>
    </Card>
  );
};

type BillingPlan = "monthly" | "semiannual" | "yearly";

type BillingPlanSelectorProps = {
  value: BillingPlan;
  onChange: (plan: BillingPlan) => void;
};

const BillingPlanSelector = ({
  value,
  onChange,
}: BillingPlanSelectorProps) => {
  return (
    <Stack alignItems="center" sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Button
          size="small"
          variant={value === "monthly" ? "contained" : "text"}
          onClick={() => onChange("monthly")}
        >
          <FormattedMessage defaultMessage="Monthly" />
        </Button>
        <Button
          size="small"
          variant={value === "semiannual" ? "contained" : "text"}
          onClick={() => onChange("semiannual")}
        >
          <FormattedMessage defaultMessage="6 months" />
        </Button>
        <Button
          size="small"
          variant={value === "yearly" ? "contained" : "text"}
          onClick={() => onChange("yearly")}
        >
          <FormattedMessage defaultMessage="Yearly" />
        </Button>
      </Stack>
    </Stack>
  );
};

export type PlanListProps = {
  onSelect: (plan: PricingPlan) => void;
  disabled?: boolean;
  text?: string;
  sx?: SxProps;
  ignoreCurrentPlan?: boolean;
  showEnterprise?: boolean;
};

export const PlanList = ({
  onSelect,
  sx,
  text,
  disabled,
  ignoreCurrentPlan,
  showEnterprise,
}: PlanListProps) => {
  const intl = useIntl();
  const effectivePlan = useAppStore(getEffectivePlan);
  const [billingPlan, setBillingPlan] = useState<BillingPlan>("yearly");
  const [inviteCodeDialogOpen, setInviteCodeDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteCodeError, setInviteCodeError] = useState(false);

  const proMonthlyPrice = useAppStore((state) =>
    getKrwPriceFromKey(state, "pro_monthly"),
  );
  const proSemiannualPrice = useAppStore((state) =>
    getKrwPriceFromKey(state, "pro_semiannual"),
  );
  const proYearlyPrice = useAppStore((state) =>
    getKrwPriceFromKey(state, "pro_yearly"),
  );
  const displayPrice =
    billingPlan === "monthly"
      ? proMonthlyPrice
      : billingPlan === "semiannual"
        ? proSemiannualPrice
        : proYearlyPrice;
  const selectedPricingPlan =
    billingPlan === "monthly"
      ? "pro_monthly"
      : billingPlan === "semiannual"
        ? "pro_semiannual"
        : "pro_yearly";

  useOnEnter(() => {
    loadPrices();
  });

  const getText = (plan: MemberPlan) => {
    if (effectivePlan === plan && !ignoreCurrentPlan) {
      return {
        text: intl.formatMessage({ defaultMessage: "Current plan" }),
        disabled: true,
      };
    }

    return {
      text: text ?? intl.formatMessage({ defaultMessage: "Continue" }),
      disabled,
    };
  };

  const handleEnterpriseClick = () => {
    setInviteCodeDialogOpen(true);
    setInviteCode("");
    setInviteCodeError(false);
  };

  const handleInviteCodeSubmit = () => {
    if (inviteCode.toUpperCase() === ENTERPRISE_INVITE_CODE) {
      setInviteCodeDialogOpen(false);
      onSelect("enterprise");
    } else {
      setInviteCodeError(true);
    }
  };

  const handleInviteCodeCancel = () => {
    setInviteCodeDialogOpen(false);
  };

  const freeCard = (
    <PlanCard
      title={<FormattedMessage defaultMessage="Free" />}
      price={
        <Stack>
          <Typography variant="h5" fontWeight={600}>
            <FormattedMessage defaultMessage="$0" />
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <FormattedMessage defaultMessage="No credit card required" />
          </Typography>
        </Stack>
      }
      buttonVariant="outlined"
      cardSx={{ borderColor: "level1" }}
      button={
        <Button
          variant="outlined"
          size="small"
          onClick={() => onSelect("free")}
          disabled={getText("free").disabled}
          fullWidth
          sx={{ py: 0.5 }}
        >
          {getText("free").text}
        </Button>
      }
    >
      <CheckmarkRow>
        <FormattedMessage defaultMessage="500 words per month" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="AI dictation" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Commercial use" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Community support" />
      </CheckmarkRow>
    </PlanCard>
  );

  const proCard = (
    <PlanCard
      title={<FormattedMessage defaultMessage="Pro" />}
      price={
        <Stack>
          <Typography variant="h5" fontWeight={600}>
            {displayPrice ? `₩${displayPrice.toLocaleString()}` : "--"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {billingPlan === "yearly" ? (
              <FormattedMessage
                defaultMessage="Billed annually"
              />
            ) : billingPlan === "semiannual" ? (
              <FormattedMessage defaultMessage="Billed every 6 months" />
            ) : (
              <FormattedMessage defaultMessage="Billed monthly" />
            )}
          </Typography>
        </Stack>
      }
      cardSx={{ borderColor: "primary.main" }}
      button={
        <Button
          variant="blue"
          size="small"
          onClick={() => onSelect(selectedPricingPlan)}
          disabled={getText("pro").disabled}
          fullWidth
          sx={{ py: 0.5 }}
        >
          {getText("pro").text}
        </Button>
      }
    >
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Unlimited words per month" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Access to beta features" />
      </CheckmarkRow>
      {/* <CheckmarkRow>
        <FormattedMessage defaultMessage="Advanced agent mode" />
      </CheckmarkRow> */}
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Cross-device sync" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Priority support" />
      </CheckmarkRow>
    </PlanCard>
  );

  const enterpriseCard = (
    <PlanCard
      title={<FormattedMessage defaultMessage="Enterprise" />}
      price={
        <Stack>
          <Typography variant="h5" fontWeight={600}>
            <FormattedMessage defaultMessage="Custom" />
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <FormattedMessage defaultMessage="Contact for pricing" />
          </Typography>
        </Stack>
      }
      cardSx={{ borderColor: "level1" }}
      button={
        <Button
          variant="outlined"
          size="small"
          onClick={handleEnterpriseClick}
          disabled={disabled}
          fullWidth
          sx={{ py: 0.5 }}
        >
          {text ?? intl.formatMessage({ defaultMessage: "Continue" })}
        </Button>
      }
    >
      <CheckmarkRow disabled>
        <FormattedMessage defaultMessage="Everything in Pro" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="On-premise deployment" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Custom integrations" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Data privacy & compliance" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Dedicated support" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Bring your own cloud" />
      </CheckmarkRow>
    </PlanCard>
  );

  const enterpriseDialog = (
    <Dialog
      open={inviteCodeDialogOpen}
      onClose={handleInviteCodeCancel}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        <FormattedMessage defaultMessage="Enter invite code" />
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <FormattedMessage defaultMessage="Contact slit.amazing@gmail.com to get an enterprise account with dedicated support." />
        </Typography>
        <TextField
          autoFocus
          fullWidth
          variant="outlined"
          value={inviteCode}
          onChange={(e) => {
            setInviteCode(e.target.value);
            setInviteCodeError(false);
          }}
          error={inviteCodeError}
          helperText={
            inviteCodeError ? (
              <FormattedMessage defaultMessage="Invalid invite code" />
            ) : undefined
          }
          placeholder={intl.formatMessage({
            defaultMessage: "Enter your code",
          })}
          sx={{ mt: 1 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleInviteCodeSubmit();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleInviteCodeCancel}>
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <Button onClick={handleInviteCodeSubmit} variant="contained">
          <FormattedMessage defaultMessage="Continue" />
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      {enterpriseDialog}
      <Stack
        sx={{
          flexDirection: "column",
          alignItems: "center",
          ...sx,
        }}
      >
        <BillingPlanSelector
          value={billingPlan}
          onChange={setBillingPlan}
        />
        <Stack
          sx={{
            flexDirection: "row",
            gap: 2,
            alignItems: "stretch",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {freeCard}
          {proCard}
          {showEnterprise && enterpriseCard}
        </Stack>
      </Stack>
    </>
  );
};
