const fs = require('fs'); //module provides a lot of very useful functionality to access and interact with the file system.
const path = require("path"); //module provides utilities for working with file and directory paths. It can be accessed using:
const CopyWebpackPlugin = require("copy-webpack-plugin"); //Copies individual files or entire directories, which already exist, to the build directory.
const HtmlWebpackPlugin = require("html-webpack-plugin"); //The plugin will generate an HTML5 file for you that includes all your webpack bundles in the body using script tags
const MiniCssExtractPlugin = require("mini-css-extract-plugin"); //This plugin extracts CSS into separate files. It creates a CSS file per JS file which contains CSS
const { CleanWebpackPlugin } = require("clean-webpack-plugin"); //A webpack plugin to remove/clean your build folders.

// Webpack configuration
module.exports = (env, argv) => {
    const outputDirectory = path.resolve(__dirname, "deploy");
    const productionMode = argv.mode === "production";
    const pixiJSPath = "./node_modules/pixi.js/dist/" + (productionMode ? "pixi.min.js" : "pixi.js");
    const matterJSPath = "./node_modules/matter-js/build/" + (productionMode ? "matter.min.js" : "matter.js");
    const devToolMap = argv.mode !== "production" && "source-map";

    const filesToCopy = [
        {
            from: './static/assets',
            to: __dirname + '/deploy/assets'
        },
        {
            "from": pixiJSPath,
            "to": outputDirectory + "/js/pixi.js"
        },
        {
            "from": matterJSPath,
            "to": outputDirectory + "/js/matter.js"
        }
            
      ];

    if (!productionMode) {
        const from = path.join(__dirname + "/static/edit");
        if (fs.existsSync(from)) {
          filesToCopy.push(  {
                from: './static/edit',
                to: __dirname + '/deploy/edit'
            });
        }
      }

    const config = {
        entry: [path.join(__dirname, "/src/index.js")],
        devtool: devToolMap,
        output: {
            filename: "main.js",
            path: __dirname + "/deploy"
        },
        module: {
            rules: [
                {
                    test: /\.m?js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: "babel-loader",
                        options: {
                            presets: ["@babel/preset-env"]
                        }
                    }
                },
                {
                    test: /\.css$/,
                    use: [MiniCssExtractPlugin.loader, "css-loader?url=false"]
                },
            ]
        },
        externals: {
            pixi: "pixi"
        },
        plugins: [
            new CleanWebpackPlugin({
                cleanStaleWebpackAssets: false, // resolve conflict with `CopyWebpackPlugin`
            }),
            new HtmlWebpackPlugin({
                template: path.join(__dirname, "templates", "index.html"),
                templateParameters: {
                    title: "PIXI Test",
                },
                minify:false
            }),
            new MiniCssExtractPlugin(),
            new CopyWebpackPlugin({
                    patterns: filesToCopy
            })
        ]
    };

    return config;
};