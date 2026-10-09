<?php

namespace App\DTOs\Admin;

readonly class CourseAnalyticsData
{
    public function __construct(
        public string $courseTitle,
        public int $enrolledStudents,
        public float $completionRate
    ) {}
}
