<?php
namespace App\DTOs\Admin;

use App\Models\Course;
use App\Models\Module;

readonly class CourseEditData {
    public function __construct(
        public int $id,
        public string $title,
        public array $modules,
    ) {}

    public static function fromModel(Course $course): self {
        return new self(
            id: $course->id,
            title: $course->title,
            modules: $course->modules()->ordered()->with('lessons')->get()->map(fn(Module $m) => ModuleEditData::fromModel($m))->all()
        );
    }
}
