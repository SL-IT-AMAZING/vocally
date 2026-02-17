import type { Preview } from "@storybook/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router-dom";
import koMessages from "../src/i18n/locales/ko.json";
import "../src/styles/global.css";

const preview: Preview = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <IntlProvider locale="ko" defaultLocale="ko" messages={koMessages}>
          <div
            style={{ background: "#000", color: "#f5f5f7", minHeight: "100vh" }}
          >
            <Story />
          </div>
        </IntlProvider>
      </MemoryRouter>
    ),
  ],
};

export default preview;
