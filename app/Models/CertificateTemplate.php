<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CertificateTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'pole',
        'logo_path',
        'body_text',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
