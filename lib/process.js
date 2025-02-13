'use strict';
const { encodeURL } = require('hexo-util');

const pathFn = require('path');
const urljoin = require('url-join');


function getCdnConfig(ctx) {
    var cdnConfig = null;
    if (typeof (ctx.config.jsdelivr_cdn) !== 'undefined') {
        cdnConfig = ctx.config.jsdelivr_cdn;
    }
    return cdnConfig;
}

function removeLastSlash(s) {
    if (s.length === 0)
        return s;
    if (s[s.length - 1] === '/')
        return s.substring(0, s.length - 1);
    return s;
}
function isAbsolutePath(p) {
    return /^https?:\/\//i.test(p);
} 
// replace all asset_img tag with html img tag
function processPost(data) {
    let cdnConfig = getCdnConfig(this);
    const postAssetDirName = "post-assets";
        // var reg = /!\[(.*)\]\((.*)\)/g;: ", data.source, " full_source: ", data.full_source);
    if(typeof data.asset_dir !== "undefined" && typeof this.config !== "undefined") {
        if(!this.config.post_asset_folder) {
            throw new TypeError("post_asset_folder in _config.yml must be set true to use cdn-jsdelivr");
        }
        // let cdnUrlPrefix = removeLastSlash(cdnConfig.cdn_url_prefix) + "@latest"
        let cdnUrlPrefix = removeLastSlash(cdnConfig.cdn_url_prefix)
        let postUrlPrefix = urljoin(cdnUrlPrefix, postAssetDirName);
        // let imgTagReg = /{%\s*asset_img\s+([^%\s]+)\s+([^%]*)%?}/g;
        // data.content = data.content.replace(imgTagReg, "<img src=\"" + urljoin(postUrlPrefix, pathFn.basename(data.asset_dir), '$1') + "\" alt=\"" + "$2" + "\">");
        
        // 先替换 HTML 格式的图片 <img src="img.png" />
        let imgHtmlReg = /<img\s+src="([^"]+)"\s*[^>]*>/g;
        data.content = data.content.replace(imgHtmlReg, (match, imgPath) => {
            if (isAbsolutePath(imgPath)) {
                return match;
            }
            // 拼接完整的 CDN 图片 URL
            let imgUrl = urljoin(postUrlPrefix, pathFn.basename(data.asset_dir), imgPath);
            return `<img src="${encodeURL(imgUrl)}">`;
        });

        // 然后替换 Markdown 格式的图片 ![alt](img.png)
        let imgMarkdownReg = /!\[([^\]]*)\]\(([^)]+)\)/g;
        data.content = data.content.replace(imgMarkdownReg, (match, altText, imgPath) => {
            if (isAbsolutePath(imgPath)) {
                return match;
            }
            // 拼接完整的 CDN 图片 URL
            let imgUrl = urljoin(postUrlPrefix, pathFn.basename(data.asset_dir), imgPath);
            return `<img src="${encodeURL(imgUrl)}" alt="${altText}">`;
        });
        // 检查并修改 Front-matter 中的 cover 参数
        if (data.cover && !isAbsolutePath(data.cover)) {
            // 如果 cover 是相对路径，则替换为 CDN 路径
            data.cover = urljoin(postUrlPrefix, pathFn.basename(data.asset_dir), data.cover);
        }
    }
    return data;
}



module.exports.processPost = processPost;

module.exports.getCdnConfig = getCdnConfig;