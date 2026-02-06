import { Box, Stack, Typography } from "@mui/material";
import { HistoryOutlined } from "@mui/icons-material";
import { getRec } from "@repo/utilities";
import dayjs from "dayjs";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store";
import { TypographyWithMore } from "../common/TypographyWithMore";
import { Section } from "../common/Section";

export const RecentTranscriptions = () => {
  const nav = useNavigate();
  const recentIds = useAppStore((state) => state.home.recentIds);

  if (recentIds.length === 0) {
    return (
      <Section title={<FormattedMessage defaultMessage="Recent" />}>
        <Box
          sx={{
            py: 4,
            textAlign: "center",
          }}
        >
          <HistoryOutlined sx={{ fontSize: 40, opacity: 0.2, mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            <FormattedMessage defaultMessage="Start dictating to see your history here." />
          </Typography>
        </Box>
      </Section>
    );
  }

  return (
    <Section
      title={<FormattedMessage defaultMessage="Recent" />}
      action={
        <Typography
          variant="body2"
          color="primary"
          onClick={() => nav("/dashboard/transcriptions")}
          sx={{ cursor: "pointer", fontWeight: 500 }}
        >
          <FormattedMessage defaultMessage="View all" />
        </Typography>
      }
    >
      <Stack spacing={1.5}>
        {recentIds.map((id) => (
          <RecentTranscriptionItem key={id} id={id} />
        ))}
      </Stack>
    </Section>
  );
};

const RecentTranscriptionItem = ({ id }: { id: string }) => {
  const transcription = useAppStore((state) =>
    getRec(state.transcriptionById, id),
  );

  if (!transcription) return null;

  return (
    <Box
      sx={{
        py: 1.5,
        px: 2,
        borderRadius: 2,
        backgroundColor: "level1",
        "&:hover": { backgroundColor: "level2" },
        transition: "background-color 0.15s ease",
        cursor: "default",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={0.5}
      >
        <Typography variant="caption" color="text.secondary">
          {dayjs(transcription.createdAt).format("MMM D, h:mm A")}
        </Typography>
      </Stack>
      <TypographyWithMore variant="body2" color="text.primary" maxLines={2}>
        {transcription.transcript}
      </TypographyWithMore>
    </Box>
  );
};
