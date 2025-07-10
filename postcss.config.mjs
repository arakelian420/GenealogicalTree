const config = {
  plugins: [
    "@tailwindcss/postcss",
    [
      "postcss-preset-env",
      {
        features: {
          "oklab-color-function": {
            preserve: true,
          },
        },
      },
    ],
  ],
};

export default config;
