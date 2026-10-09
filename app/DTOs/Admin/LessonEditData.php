<?php
namespace App\DTOs\Admin;

use App\Models\Lesson;

readonly class LessonEditData {
    public function __construct(
        public int $id,
        public string $title,
        public int $sortOrder,
        public bool $hasVideo,
    ) {}

    public static function fromModel(Lesson $lesson): self {
        return new self(
            id: $lesson->id,
            title: $lesson->title,
            sortOrder: $lesson->sort_order,
            hasVideo: $lesson->video_id !== null,
        );
    }
}
