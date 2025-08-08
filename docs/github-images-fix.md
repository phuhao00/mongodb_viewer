# GitHub 图片显示修复说明

## 问题描述
GitHub 在渲染 README.md 中的 SVG 图片时可能出现 "Error rendering embedded code - Invalid image source" 错误。

## 解决方案
我们已经将所有图片引用从相对路径改为 GitHub Raw 链接格式。

## 需要手动操作

### 1. 替换 GitHub 用户名
在 README.md 文件中，将所有的 `your-username` 替换为实际的 GitHub 用户名：

```bash
# 使用 sed 命令批量替换（Linux/macOS）
sed -i 's/your-username/实际用户名/g' README.md

# 或者使用 PowerShell（Windows）
(Get-Content README.md) -replace 'your-username', '实际用户名' | Set-Content README.md
```

### 2. 确认仓库名称
确保 URL 中的仓库名 `mongo_view` 与实际仓库名一致。

### 3. 推送到 main 分支
确保图片文件已推送到 GitHub 的 main 分支：

```bash
git add docs/images/
git commit -m "Add architecture diagrams"
git push origin main
```

## 图片文件列表
以下 SVG 文件需要在 GitHub 上可访问：
- `docs/images/architecture.svg`
- `docs/images/features.svg`
- `docs/images/interface-mockup.svg`
- `docs/images/workflow.svg`

## 验证方法
1. 推送代码到 GitHub
2. 在 GitHub 仓库页面查看 README.md
3. 确认所有图片正常显示

## 备选方案
如果 SVG 图片仍然无法显示，可以考虑：
1. 转换为 PNG 格式
2. 使用 GitHub Issues 或 Wiki 上传图片
3. 使用第三方图片托管服务