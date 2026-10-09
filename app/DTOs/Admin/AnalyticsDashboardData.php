<?php

namespace App\DTOs\Admin;

readonly class AnalyticsDashboardData
{
    /**
     * @param CourseAnalyticsData[] $courseMetrics
     */
    public function __construct(
        public int $totalActiveStudents,
        public float $globalCompletionRate,
        public float $globalQuizPassRate,
        public array $courseMetrics,
        public array $monthlyEnrollments
    ) {}
}
