const config = {
  plugins: [
    "@tailwindcss/postcss",
    [
      "postcss-preset-env",
      {
        features: {
          "oklab-function": {
            preserve: true,
          },
        },
      },
    ],
  ],
};

export default config;
