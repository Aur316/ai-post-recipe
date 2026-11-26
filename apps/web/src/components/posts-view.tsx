import { type RunDetailDto, instagramHandle } from '@ai-post-recipe/shared'

import { PostPreview } from '@/components/post-preview'

/** The finished posts of the run, as Instagram-like previews. */
export function PostsView({ run }: { run: RunDetailDto }) {
  return (
    <div className="@container">
      <div className="grid gap-4 @3xl:grid-cols-3">
        {run.posts.map((post) => (
          <PostPreview
            key={post.id}
            runId={run.id}
            post={post}
            brandName={instagramHandle(run.brief.instagramUrl) ?? run.brandName}
            logo={run.assets.find((a) => a.kind === 'UPLOAD_LOGO')}
            locked={run.status === 'RUNNING'}
          />
        ))}
      </div>
    </div>
  )
}
