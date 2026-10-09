<?php
namespace App\DTOs\Admin;

use App\Models\Course;

readonly class CourseFormData {
    /**
     * @param string[] $languages
     */
    public function __construct(
        public ?int $id,
        public string $title,
        public string $description,
        public string $pole,
        public array $languages,
        public string $status,
    ) {}

    public static function empty(): self
    {
        return new self(
            id: null,
            title: '',
            description: '',
            pole: '',
            languages: [],
            status: 'draft',
        );
    }

    public static function fromModel(Course $course): self
    {
        return new self(
            id: $course->id,
            title: $course->title,
            description: $course->description,
            pole: $course->pole,
            languages: $course->languages ?? [],
            status: $course->status,
        );
    }
}
