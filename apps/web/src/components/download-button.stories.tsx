import type { Meta, StoryObj } from "@storybook/react";
import { DownloadButton } from "./download-button";

const meta = {
  title: "Common/DownloadButton",
  component: DownloadButton,
} satisfies Meta<typeof DownloadButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: {
    label: "Get Vocally Free",
  },
};

export const WithCustomClass: Story = {
  args: {
    label: "Download Now",
    className: "",
  },
};
