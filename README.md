# 森林小狐狸 Web Edition

这个文件夹就是可以直接部署到 GitHub Pages 的静态网站。

## 页面行为

- 默认页面显示 Blender 场景的**原摄像机视角**，使用 `assets/forest-fox-camera.png`。
- `进入 3D 浏览` 会加载完整场景的静态 WebGL 模型 `assets/forest-fox.glb`。
- WebGL 模式默认使用 GLB 内嵌的 `摄像机`，因此仍然保持原文件的 16:9 构图。
- `自由观察` 只在需要时打开轨道控制，不会改变默认摄像机画面。
- Three.js、3D 控制器和 Draco 解码器已随网站放在 endor/ 中；互动浏览不依赖外部 CDN。
- 页面没有构建步骤，HTML/CSS/JavaScript 和资源可以直接放进 Pages。

## 文件说明

```text
forest-fox-web/
├─ index.html
├─ app.js
├─ styles.css
├─ .nojekyll
├─ assets/
│  ├─ forest-fox-camera.png   # Blender 摄像机画面，1920×1080
│  └─ forest-fox.glb          # 当前帧的 Draco 压缩 WebGL 场景
└─ .github/workflows/
   └─ deploy-pages.yml
```

原始工程 `森林小狐狸.blend` 没有放进网页目录，原文件保持独立保存。

## 部署到 GitHub Pages

1. 在 GitHub 新建一个空仓库，例如 `forest-fox-web`。
2. 把本文件夹里的**全部内容**上传到仓库根目录。
3. 推送到 `main` 分支后，仓库里的 `deploy-pages.yml` 会自动发布静态网站。
4. 在仓库的 Pages 设置中选择 **GitHub Actions** 作为发布来源。
5. 等待工作流完成后，打开 GitHub Pages 给出的站点地址。

## 本地预览

不要直接双击 `index.html`，因为浏览器会限制本地模型文件的加载。使用任意静态文件服务器打开 `forest-fox-web` 目录即可。GitHub Pages 部署后无需额外配置。

## 重要说明

网页默认画面是为了保持 Blender 摄像机视角和最终构图；WebGL 版本是完整场景的浏览器实时预览。浏览器材质、灯光、景深和合成器效果与 Blender Cycles 不能保证逐像素一致，因此默认页面优先展示摄像机画面。

