const presets = [
    [
        "@babel/preset-env",
        {
            "targets": {
                "browsers": [
                    "last 2 versions",
                    "Safari >= 8",
                    "IE >= 11",
                    "Firefox >= 57",
                    "Edge >= 14",
                    "Chrome >= 63"
                ]
            }
        }
    ]
];

const plugins = [
    [
        "@babel/plugin-transform-runtime",
        {
            "regenerator": true,
            "corejs": 3
        }
    ]
];

module.exports = api => {
    api.cache(true);

    return {
        presets,
        plugins
    }
}