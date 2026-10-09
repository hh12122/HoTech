<?php

namespace App\DTOs\Admin;

readonly class ScrapedQuestionData
{
    /**
     * @param ScrapedAnswerData[] $answers
     */
    public function __construct(
        public string $text,
        public array $answers,
        public float $confidenceScore
    ) {}
    
    public function toArray(): array
    {
        return [
            'text' => $this->text,
            'answers' => array_map(fn($ans) => $ans->toArray(), $this->answers),
            'confidenceScore' => $this->confidenceScore,
        ];
    }
}
