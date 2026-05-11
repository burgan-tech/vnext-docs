---
sidebar_position: 3
title: Persistence Strategy
description: Entity Framework, Master Data tabloları, CDC, replikasyon
---


# Persistance

İş akış örneklerinin saklanması için bir veri tabanı katmanı sunulur. Bu katmanda tüm akış örnekleri ve ilişkili verileri tutulur. Bu katman **master data** olarak anılır.

vNext Platform, Dual-Write Pattern (Çift Yazma Deseni) destekler. Bu destek ile:
* Event Sourcing yaklaşımı ile iş akış örneklerinde veri değişimleri bir akış olarak sunulabilir. (CDC - Change Data Capture) 
* İş akış örneklerinin birer kopyaları başka bir veritabanında barındırılabilir. (Replication)

## Master Data

İş akış örneklerini saklamak için Entity Framework tabanlı veritabanı kullanılır:
- Her bir akış için şema yaratılır.
- Her bir akış örneği farklı veri tablolarında saklanır.
- Her bir domain farklı veritabanı ile çalışır.
- Her bir runtime sadece bir domain çalıştırır.
- Domainler runtime'lara bölünemez.

## Akış Şemaları

Her bir akış için bir şema oluşturulup içerisinde verileri saklamak için ön tanımlı bir tablo kümesi yaratılır.

### Tablolar

**Instance**: Her bir iş akış örneğinin temel bilgilerini tutar.

**InstanceData**: İş akışının içerdiği veri kümesini tutar.

**InstanceCorrelation**: SubProcess/SubFlow tipinde başlatılmış iş akış örneklerinin referanslarıdır. SubProcess/SubFlow farklı bir domain üzerinde çalışıyor olabilir.

**InstanceTransition**: İş akış örneği ile ilgili tüm geçiş bilgilerini tutar.

**InstanceTask**: İş akış örneği ile ilgili tüm görev çalışma bilgilerini tutar.

**InstanceAction**: İş akış örneğinde çalıştırılan bir görev ile ilgili tüm alt adım çalışma bilgilerini tutar.

**InstanceJobs**: İş akış örneğinde çalıştırılan zamanlanmış görevler ile ilgili tüm bilgileri tutar.

***Task***
> Task birden fazla konu için çalışabilir, bu yüzden ne amaçla tetiklendiğini bilmek için Type enum tipi bulunmaktadır.
> Task'ı tetikleyen tipin kayıt örneğinin tekil numarası için reference alanı kullanılır.