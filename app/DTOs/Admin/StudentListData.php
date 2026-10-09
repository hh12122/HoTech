<?php

namespace App\DTOs\Admin;

readonly class StudentListData
{
    public function __construct(
        public int $id,
        public string $name,
        public string $email,
        public bool $isActive,
        public ?string $lastLoginAt,
        public int $enrolledCoursesCount
    ) {}
}
