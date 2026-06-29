import type { Preview } from "@storybook/nextjs-vite";
import React from "react";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "terminal",
      values: [
        { name: "terminal", value: "#0a0e27" },
        { name: "light", value: "#ffffff" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) =>
      React.createElement(
        "div",
        { className: "dark min-h-screen bg-terminal-black p-8 font-mono" },
        React.createElement(Story)
      ),
  ],
};

export default preview;
