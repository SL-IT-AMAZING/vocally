import { Box, Stack, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useAppStore } from "../../store";
import { getMyUser, getMyUserName } from "../../utils/user.utils";
import { DashboardEntryLayout } from "../dashboard/DashboardEntryLayout";
import { HomeSideEffects } from "./HomeSideEffects";
import { RecentTranscriptions } from "./RecentTranscriptions";
import { Stat } from "./Stat";

export default function HomePage() {
  const user = useAppStore(getMyUser);
  const userName = useAppStore(getMyUserName);
  const intl = useIntl();

  const wordsThisMonth = user?.wordsThisMonth ?? 0;
  const wordsTotal = user?.wordsTotal ?? 0;

  return (
    <DashboardEntryLayout>
      <HomeSideEffects />
      <Stack direction="column">
        <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
          <FormattedMessage
            defaultMessage="Welcome, {name}"
            values={{ name: userName }}
          />
        </Typography>
        <Box sx={{ my: 3 }}>
          <Stack
            direction="row"
            spacing={2}
            sx={{ mb: 2 }}
            justifyContent="space-around"
          >
            <Stat
              label={intl.formatMessage({
                defaultMessage: "Words this month",
              })}
              value={wordsThisMonth}
            />
            <Stat
              label={intl.formatMessage({
                defaultMessage: "Words total",
              })}
              value={wordsTotal}
            />
          </Stack>
        </Box>
        <RecentTranscriptions />
      </Stack>
    </DashboardEntryLayout>
  );
}
