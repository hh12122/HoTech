<?php

namespace App\DTOs\Admin;

readonly class StudentEnrollmentData
{
    public function __construct(
        public int $courseId,
        public string $courseTitle,
        public string $enrolledAt,
        public float $completionRate
    ) {}
}
