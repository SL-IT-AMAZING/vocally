import type { Meta, StoryObj } from "@storybook/react";
import { DownloadPageContent } from "./download-page-content";

const meta = {
  title: "Marketing/DownloadPageContent",
  component: DownloadPageContent,
} satisfies Meta<typeof DownloadPageContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
