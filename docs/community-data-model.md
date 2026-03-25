# 社群广场 - 数据模型设计

## 集合: community_posts

```typescript
interface CommunityPost {
  _id?: string;
  id: string;           // 帖子ID
  authorId: string;     // 作者用户ID
  authorName: string;    // 作者昵称
  authorAvatar?: string; // 作者头像
  
  text: string;         // 正文内容
  category: string;     // 分类：职场/生活/情感/其他
  
  warmthCount: number;   // 暖心数
  warmedBy: string[];    // 已暖心用户ID列表
  
  commentCount: number; // 评论数
  shareCount: number;   // 转发数
  
  collectedBy: string[]; // 已收藏用户ID列表
  
  createdAt: number;    // 发布时间戳
  updatedAt: number;     // 更新时间
}
```

## 集合: community_comments

```typescript
interface CommunityComment {
  _id?: string;
  id: string;
  postId: string;      // 所属帖子ID
  authorId: string;
  authorName: string;
  text: string;         // 评论内容
  createdAt: number;
}
```

## 分类

- 职场
- 生活
- 情感
- 其他

## 交互

- 暖心: 点❤️，toggle，已暖心不再重复计数
- 评论: 跳转评论区（暂不实现完整评论区，简化为显示评论数）
- 转发: 显示转发数（暂不实现）
- 收藏: toggle，显示收藏数
