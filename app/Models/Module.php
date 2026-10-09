<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Module extends Model
{
    use HasFactory;
    
    protected $guarded = [];

    public function course() { return $this->belongsTo(Course::class); }
    public function lessons() { return $this->hasMany(Lesson::class); }
    public function quiz() { return $this->hasOne(Quiz::class); }

    public function scopeOrdered($query) { return $query->orderBy('sort_order'); }
}
