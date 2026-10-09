<?php
namespace App\DTOs\Admin;

use App\Models\Module;
use App\Models\Lesson;

readonly class ModuleEditData {
    public function __construct(
        public int $id,
        public string $title,
        public int $sortOrder,
        public array $lessons,
    ) {}

    public static function fromModel(Module $module): self {
        return new self(
            id: $module->id,
            title: $module->title,
            sortOrder: $module->sort_order,
            lessons: $module->lessons()->ordered()->get()->map(fn(Lesson $l) => LessonEditData::fromModel($l))->all()
        );
    }
}
